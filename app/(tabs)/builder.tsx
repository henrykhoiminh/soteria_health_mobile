import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { getRoutineById } from '@/lib/utils/dashboard';
import {
  getAvailableExercises,
  publishCustomRoutine,
  updateCustomRoutine,
  validateRoutineData,
  isHealthTeamMember,
} from '@/lib/utils/routine-builder';
import {
  Exercise,
  JourneyFocusOption,
  Routine,
  RoutineBuilderData,
  RoutineBuilderExercise,
  RoutineCategory,
  RoutineDifficulty,
  UPPER_BODY_AREAS,
  LOWER_BODY_AREAS,
  BodyRegion,
} from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type BuilderStep = 'journey' | 'exercises' | 'metadata' | 'review';

export default function RoutineBuilderScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [currentStep, setCurrentStep] = useState<BuilderStep>('journey');
  const [loading, setLoading] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [isHealthTeam, setIsHealthTeam] = useState(false);
  const [createAsOfficial, setCreateAsOfficial] = useState(false);

  // Builder state
  const [routineData, setRoutineData] = useState<RoutineBuilderData>({
    name: '',
    description: '',
    category: 'Mind',
    difficulty: 'Beginner',
    journeyFocus: 'Injury Prevention',
    exercises: [],
    tags: [],
    body_parts: [],
  });

  useEffect(() => {
    loadExercises();
    checkHealthTeamStatus();
    if (editId) {
      loadRoutineForEditing(editId);
    }
  }, [editId]);

  const checkHealthTeamStatus = async () => {
    if (!user) return;
    const healthTeamStatus = await isHealthTeamMember(user.id);
    setIsHealthTeam(healthTeamStatus);
  };

  const loadExercises = async () => {
    try {
      setLoading(true);
      const exercises = await getAvailableExercises();
      setAvailableExercises(exercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const loadRoutineForEditing = async (routineId: string) => {
    try {
      setLoading(true);
      const routine = await getRoutineById(routineId);

      if (!routine || !user) {
        Alert.alert('Error', 'Routine not found');
        return;
      }

      // Verify user owns this routine
      if (!routine.is_custom || routine.created_by !== user.id) {
        Alert.alert('Error', 'You can only edit your own custom routines');
        router.replace('/(tabs)/routines');
        return;
      }

      // Convert routine to builder format
      const journeyFocus: JourneyFocusOption =
        routine.journey_focus.length === 2
          ? 'Both'
          : (routine.journey_focus[0] as JourneyFocusOption);

      const exercises: RoutineBuilderExercise[] = routine.exercises.map((ex, index) => ({
        ...ex,
        id: `${Date.now()}-${index}`,
      }));

      setRoutineData({
        name: routine.name,
        description: routine.description,
        category: routine.category,
        difficulty: routine.difficulty,
        journeyFocus,
        exercises,
        tags: routine.tags || [],
        body_parts: routine.body_parts || [],
      });

      setIsEditMode(true);
      setEditingRoutineId(routineId);
      setCurrentStep('journey');
    } catch (error) {
      console.error('Error loading routine for editing:', error);
      Alert.alert('Error', 'Failed to load routine');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Start Over?',
      'This will clear all your progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setRoutineData({
              name: '',
              description: '',
              category: 'Mind',
              difficulty: 'Beginner',
              journeyFocus: 'Injury Prevention',
              exercises: [],
              tags: [],
              body_parts: [],
            });
            setCurrentStep('journey');
          },
        },
      ]
    );
  };

  const handlePublish = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to publish a routine');
      return;
    }

    const validation = validateRoutineData(routineData);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    try {
      setLoading(true);

      if (isEditMode && editingRoutineId) {
        // Update existing routine
        await updateCustomRoutine(user.id, editingRoutineId, routineData);

        Alert.alert(
          'Success!',
          'Your routine has been updated!',
          [
            {
              text: 'View Routine',
              onPress: () => router.replace(`/routines/${editingRoutineId}`),
            },
          ]
        );
      } else {
        // Create new routine
        const routineId = await publishCustomRoutine(user.id, routineData, createAsOfficial);

        const successMessage = createAsOfficial
          ? 'Your official Soteria routine has been published to Discover!'
          : 'Your custom routine has been published!';

        Alert.alert(
          'Success!',
          successMessage,
          [
            {
              text: 'View Routine',
              onPress: () => router.push(`/routines/${routineId}`),
            },
            {
              text: 'Create Another',
              onPress: () => {
                setRoutineData({
                  name: '',
                  description: '',
                  category: 'Mind',
                  difficulty: 'Beginner',
                  journeyFocus: 'Injury Prevention',
                  exercises: [],
                  tags: [],
                  body_parts: [],
                });
                setCurrentStep('journey');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error publishing/updating routine:', error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'publish'} routine. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => {
    const steps: BuilderStep[] = ['journey', 'exercises', 'metadata', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {currentIndex + 1} of {steps.length}
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'journey':
        return (
          <JourneyFocusStep
            selected={routineData.journeyFocus}
            onSelect={(journeyFocus) => {
              setRoutineData({ ...routineData, journeyFocus });
              setCurrentStep('exercises');
            }}
          />
        );
      case 'exercises':
        return (
          <ExerciseSelectionStep
            availableExercises={availableExercises}
            selectedExercises={routineData.exercises}
            onUpdate={(exercises) =>
              setRoutineData({ ...routineData, exercises })
            }
            onNext={() => setCurrentStep('metadata')}
            onBack={() => setCurrentStep('journey')}
          />
        );
      case 'metadata':
        return (
          <MetadataStep
            data={routineData}
            onUpdate={(data) => setRoutineData({ ...routineData, ...data })}
            onNext={() => setCurrentStep('review')}
            onBack={() => setCurrentStep('exercises')}
          />
        );
      case 'review':
        return (
          <ReviewStep
            data={routineData}
            onPublish={handlePublish}
            onBack={() => setCurrentStep('metadata')}
            loading={loading}
            isEditMode={isEditMode}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isEditMode ? 'Edit Routine' : 'Routine Builder'}
        </Text>
        <TouchableOpacity onPress={handleReset}>
          <Ionicons name="refresh" size={24} color={AppColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Health Team Banner */}
      {isHealthTeam && !isEditMode && (
        <View style={styles.healthTeamBanner}>
          <View style={styles.healthTeamBannerContent}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
            <View style={styles.healthTeamBannerText}>
              <Text style={styles.healthTeamBannerTitle}>Soteria Health Team</Text>
              <Text style={styles.healthTeamBannerSubtitle}>
                {createAsOfficial
                  ? "Creating official Soteria routine"
                  : "Creating community routine"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.healthTeamToggle}
            onPress={() => setCreateAsOfficial(!createAsOfficial)}
          >
            <Ionicons
              name={createAsOfficial ? "toggle" : "toggle-outline"}
              size={32}
              color={createAsOfficial ? "#10B981" : AppColors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      {renderProgressBar()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading && currentStep === 'exercises' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={styles.loadingText}>Loading exercises...</Text>
          </View>
        ) : (
          renderContent()
        )}
      </ScrollView>
    </View>
  );
}

// Step 1: Journey Focus Selection
function JourneyFocusStep({
  selected,
  onSelect,
}: {
  selected: JourneyFocusOption;
  onSelect: (focus: JourneyFocusOption) => void;
}) {
  const options: { value: JourneyFocusOption; label: string; description: string; icon: string }[] = [
    {
      value: 'Injury Prevention',
      label: 'Injury Prevention',
      description: 'Build strength and prevent injuries before they happen',
      icon: 'shield-checkmark',
    },
    {
      value: 'Recovery',
      label: 'Recovery',
      description: 'Heal and rehabilitate from existing injuries',
      icon: 'heart',
    },
    {
      value: 'Both',
      label: 'Both',
      description: 'Comprehensive routine for prevention and recovery',
      icon: 'fitness',
    },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your journey focus?</Text>
      <Text style={styles.stepSubtitle}>
        This helps us categorize your routine for other users
      </Text>

      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionCard,
              selected === option.value && styles.optionCardSelected,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name={option.icon as any}
                size={32}
                color={selected === option.value ? AppColors.primary : AppColors.textSecondary}
              />
            </View>
            <Text style={[
              styles.optionLabel,
              selected === option.value && styles.optionLabelSelected,
            ]}>
              {option.label}
            </Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Step 2: Exercise Selection
function ExerciseSelectionStep({
  availableExercises,
  selectedExercises,
  onUpdate,
  onNext,
  onBack,
}: {
  availableExercises: Exercise[];
  selectedExercises: RoutineBuilderExercise[];
  onUpdate: (exercises: RoutineBuilderExercise[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [duration, setDuration] = useState('30');

  const filteredExercises = availableExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddExercise = () => {
    if (!selectedExercise) return;

    if (selectedExercises.length >= 30) {
      Alert.alert('Limit Reached', 'Maximum 30 exercises allowed per routine');
      return;
    }

    const durationSeconds = parseInt(duration, 10);
    if (isNaN(durationSeconds) || durationSeconds <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in seconds');
      return;
    }

    const newExercise: RoutineBuilderExercise = {
      ...selectedExercise,
      duration_seconds: durationSeconds,
      id: `${Date.now()}-${Math.random()}`,
    };

    onUpdate([...selectedExercises, newExercise]);
    setModalVisible(false);
    setSelectedExercise(null);
    setDuration('30');
  };

  const handleRemoveExercise = (id: string) => {
    onUpdate(selectedExercises.filter((ex) => ex.id !== id));
  };

  const canProceed = selectedExercises.length > 0 && selectedExercises.length <= 30;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Add Exercises</Text>
      <Text style={styles.stepSubtitle}>
        Select exercises and set their duration
      </Text>

      <View style={styles.exerciseCount}>
        <Text style={styles.exerciseCountText}>
          {selectedExercises.length}/30 exercises
        </Text>
      </View>

      {selectedExercises.length > 0 && (
        <View style={styles.selectedExercisesContainer}>
          {selectedExercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.selectedExerciseCard}>
              <View style={styles.selectedExerciseHeader}>
                <Text style={styles.selectedExerciseNumber}>{index + 1}</Text>
                <View style={styles.selectedExerciseInfo}>
                  <Text style={styles.selectedExerciseName}>{exercise.name}</Text>
                  <Text style={styles.selectedExerciseDuration}>
                    {exercise.duration_seconds}s
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveExercise(exercise.id)}>
                  <Ionicons name="close-circle" size={24} color={AppColors.body} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.addExerciseButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle" size={24} color={AppColors.primary} />
        <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
      </TouchableOpacity>

      {/* Exercise Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={AppColors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={AppColors.textTertiary}
            />
          </View>

          {selectedExercise ? (
            <View style={styles.exerciseConfigContainer}>
              <View style={styles.exerciseConfigHeader}>
                <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                  <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.exerciseConfigTitle}>Set Duration</Text>
                <View style={{ width: 24 }} />
              </View>

              <Text style={styles.exerciseConfigName}>{selectedExercise.name}</Text>
              <Text style={styles.exerciseConfigInstructions}>
                {selectedExercise.instructions}
              </Text>

              <View style={styles.durationInputContainer}>
                <Text style={styles.durationLabel}>Duration (seconds)</Text>
                <TextInput
                  style={styles.durationInput}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  placeholder="30"
                />
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={handleAddExercise}>
                <Text style={styles.confirmButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.exerciseList}>
              {filteredExercises.map((exercise, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.exerciseListItem}
                  onPress={() => setSelectedExercise(exercise)}
                >
                  <Text style={styles.exerciseListItemName}>{exercise.name}</Text>
                  <Text style={styles.exerciseListItemInstructions} numberOfLines={2}>
                    {exercise.instructions}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={AppColors.textTertiary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <View style={styles.stepNavigation}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={AppColors.textSecondary} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color={AppColors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Step 3: Metadata
function MetadataStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: RoutineBuilderData;
  onUpdate: (data: Partial<RoutineBuilderData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [showAdvancedTags, setShowAdvancedTags] = useState(false);
  const [bodyRegionFilter, setBodyRegionFilter] = useState<BodyRegion>('All');
  const [bodyRegionModalVisible, setBodyRegionModalVisible] = useState(false);
  const [bodyPartsModalVisible, setBodyPartsModalVisible] = useState(false);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const canProceed = data.name.trim().length > 0 && data.description.trim().length > 0;

  const MAX_TAGS = 5;

  const handleAddTag = () => {
    const trimmedTag = currentTagInput.trim();

    // Validation
    if (!trimmedTag) return;
    if (data.tags && data.tags.length >= MAX_TAGS) {
      Alert.alert('Maximum Tags Reached', `You can only add up to ${MAX_TAGS} tags per routine.`);
      return;
    }
    if (data.tags && data.tags.includes(trimmedTag)) {
      Alert.alert('Duplicate Tag', 'This tag has already been added.');
      return;
    }

    // Add tag
    const currentTags = data.tags || [];
    onUpdate({ tags: [...currentTags, trimmedTag] });
    setCurrentTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = data.tags || [];
    onUpdate({ tags: currentTags.filter(tag => tag !== tagToRemove) });
  };

  const toggleBodyPart = (bodyPart: string) => {
    const currentBodyParts = data.body_parts || [];
    const newBodyParts = currentBodyParts.includes(bodyPart)
      ? currentBodyParts.filter(bp => bp !== bodyPart)
      : [...currentBodyParts, bodyPart];
    onUpdate({ body_parts: newBodyParts });
  };

  const getFilteredBodyParts = () => {
    if (bodyRegionFilter === 'Upper Body') {
      return UPPER_BODY_AREAS;
    } else if (bodyRegionFilter === 'Lower Body') {
      return LOWER_BODY_AREAS;
    }
    return [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>Routine Details</Text>
      <Text style={styles.stepSubtitle}>
        Provide information about your routine
      </Text>

      <View style={styles.formContainer}>
        <Text style={styles.fieldLabel}>Routine Name *</Text>
        <TextInput
          style={styles.textInput}
          value={data.name}
          onChangeText={(name) => onUpdate({ name })}
          placeholder="e.g., Morning Stretch"
          placeholderTextColor={AppColors.textTertiary}
          maxLength={100}
        />

        <Text style={styles.fieldLabel}>Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={data.description}
          onChangeText={(description) => onUpdate({ description })}
          placeholder="Describe your routine..."
          placeholderTextColor={AppColors.textTertiary}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.segmentedControl}>
          {(['Mind', 'Body', 'Soul'] as RoutineCategory[]).map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.segmentButton,
                data.category === category && styles.segmentButtonActive,
              ]}
              onPress={() => onUpdate({ category })}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  data.category === category && styles.segmentButtonTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Difficulty</Text>
        <View style={styles.segmentedControl}>
          {(['Beginner', 'Intermediate', 'Advanced'] as RoutineDifficulty[]).map((difficulty) => (
            <TouchableOpacity
              key={difficulty}
              style={[
                styles.segmentButton,
                data.difficulty === difficulty && styles.segmentButtonActive,
              ]}
              onPress={() => onUpdate({ difficulty })}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  data.difficulty === difficulty && styles.segmentButtonTextActive,
                ]}
              >
                {difficulty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Advanced Tags Section (Optional) */}
        <TouchableOpacity
          style={styles.advancedTagsToggle}
          onPress={() => setShowAdvancedTags(!showAdvancedTags)}
        >
          <View style={styles.advancedTagsToggleContent}>
            <Text style={styles.advancedTagsToggleLabel}>Advanced Tags (Optional)</Text>
            <Text style={styles.advancedTagsToggleSubtitle}>For future AI-powered search</Text>
          </View>
          <Ionicons
            name={showAdvancedTags ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={AppColors.textSecondary}
          />
        </TouchableOpacity>

        {showAdvancedTags && (
          <View style={styles.advancedTagsContainer}>
            <Text style={styles.fieldLabel}>Tags (Max {MAX_TAGS})</Text>
            <Text style={styles.fieldHint}>
              {data.tags && data.tags.length >= MAX_TAGS
                ? `Maximum of ${MAX_TAGS} tags reached`
                : 'e.g., Desk Work, Upper Body, Stretching'}
            </Text>

            {/* Tag Input with Add Button */}
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagTextInput}
                value={currentTagInput}
                onChangeText={setCurrentTagInput}
                placeholder="Type a tag..."
                placeholderTextColor={AppColors.textTertiary}
                maxLength={30}
                editable={!data.tags || data.tags.length < MAX_TAGS}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.addTagButton,
                  (!currentTagInput.trim() || (data.tags && data.tags.length >= MAX_TAGS)) &&
                    styles.addTagButtonDisabled,
                ]}
                onPress={handleAddTag}
                disabled={!currentTagInput.trim() || (data.tags && data.tags.length >= MAX_TAGS)}
              >
                <Ionicons
                  name="add-circle"
                  size={32}
                  color={
                    !currentTagInput.trim() || (data.tags && data.tags.length >= MAX_TAGS)
                      ? AppColors.border
                      : AppColors.primary
                  }
                />
              </TouchableOpacity>
            </View>

            {/* Display Selected Tags as Chips */}
            {data.tags && data.tags.length > 0 && (
              <View style={styles.selectedTagsContainer}>
                {data.tags.map((tag) => (
                  <View key={tag} style={styles.selectedTagChip}>
                    <Text style={styles.selectedTagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                      <Ionicons name="close-circle" size={18} color={AppColors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.fieldLabel}>Body Parts (Optional)</Text>
            <Text style={styles.fieldHint}>Select body parts targeted by this routine</Text>

            {/* Body Region Filter Dropdown */}
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setBodyRegionModalVisible(true)}
            >
              <Text style={styles.dropdownText}>{bodyRegionFilter}</Text>
              <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>

            {/* Body Parts Multi-Select Dropdown */}
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setBodyPartsModalVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {data.body_parts && data.body_parts.length > 0
                  ? `${data.body_parts.length} selected`
                  : 'Select body parts'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>

            {/* Display Selected Body Parts */}
            {data.body_parts && data.body_parts.length > 0 && (
              <View style={styles.selectedBodyPartsContainer}>
                {data.body_parts.map((bodyPart) => (
                  <View key={bodyPart} style={styles.selectedBodyPartChip}>
                    <Text style={styles.selectedBodyPartText}>{bodyPart}</Text>
                    <TouchableOpacity onPress={() => toggleBodyPart(bodyPart)}>
                      <Ionicons name="close-circle" size={18} color={AppColors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Body Region Filter Modal */}
      <Modal
        visible={bodyRegionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBodyRegionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBodyRegionModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {(['All', 'Upper Body', 'Lower Body'] as BodyRegion[]).map((region) => (
              <TouchableOpacity
                key={region}
                style={styles.modalOption}
                onPress={() => {
                  setBodyRegionFilter(region);
                  setBodyRegionModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    bodyRegionFilter === region && styles.modalOptionTextActive,
                  ]}
                >
                  {region}
                </Text>
                {bodyRegionFilter === region && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Body Parts Multi-Select Modal */}
      <Modal
        visible={bodyPartsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBodyPartsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBodyPartsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Body Parts</Text>
              <TouchableOpacity onPress={() => setBodyPartsModalVisible(false)}>
                <Ionicons name="close" size={24} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {getFilteredBodyParts().map((bodyPart) => (
                <TouchableOpacity
                  key={bodyPart}
                  style={styles.modalOption}
                  onPress={() => toggleBodyPart(bodyPart)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      data.body_parts?.includes(bodyPart) && styles.modalOptionTextActive,
                    ]}
                  >
                    {bodyPart}
                  </Text>
                  {data.body_parts?.includes(bodyPart) && (
                    <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.stepNavigation}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={AppColors.textSecondary} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>Review</Text>
          <Ionicons name="arrow-forward" size={20} color={AppColors.textPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Step 4: Review & Publish
function ReviewStep({
  data,
  onPublish,
  onBack,
  loading,
  isEditMode = false,
}: {
  data: RoutineBuilderData;
  onPublish: () => void;
  onBack: () => void;
  loading: boolean;
  isEditMode?: boolean;
}) {
  const totalDuration = Math.ceil(
    data.exercises.reduce((sum, ex) => sum + ex.duration_seconds, 0) / 60
  );

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review Your Routine</Text>
      <Text style={styles.stepSubtitle}>
        Make sure everything looks good before publishing
      </Text>

      <View style={styles.reviewContainer}>
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Routine Overview</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Name:</Text>
            <Text style={styles.reviewValue}>{data.name}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Description:</Text>
            <Text style={styles.reviewValue}>{data.description}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Category:</Text>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(data.category) }]}>
              <Text style={styles.categoryBadgeText}>{data.category}</Text>
            </View>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Difficulty:</Text>
            <Text style={styles.reviewValue}>{data.difficulty}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Journey:</Text>
            <Text style={styles.reviewValue}>{data.journeyFocus}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Duration:</Text>
            <Text style={styles.reviewValue}>~{totalDuration} min</Text>
          </View>

          {/* Display Tags if present */}
          {data.tags && data.tags.length > 0 && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Tags:</Text>
              <View style={styles.reviewTagsContainer}>
                {data.tags.map((tag) => (
                  <View key={tag} style={styles.reviewTagChip}>
                    <Text style={styles.reviewTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Display Body Parts if present */}
          {data.body_parts && data.body_parts.length > 0 && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Body Parts:</Text>
              <View style={styles.reviewTagsContainer}>
                {data.body_parts.map((bodyPart) => (
                  <View key={bodyPart} style={styles.reviewBodyPartChip}>
                    <Text style={styles.reviewBodyPartText}>{bodyPart}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>
            Exercises ({data.exercises.length})
          </Text>
          {data.exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.reviewExercise}>
              <Text style={styles.reviewExerciseNumber}>{index + 1}.</Text>
              <View style={styles.reviewExerciseInfo}>
                <Text style={styles.reviewExerciseName}>{exercise.name}</Text>
                <Text style={styles.reviewExerciseDuration}>
                  {exercise.duration_seconds}s
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.stepNavigation}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={loading}>
          <Ionicons name="arrow-back" size={20} color={AppColors.textSecondary} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          onPress={onPublish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={AppColors.textPrimary} />
          ) : (
            <>
              <Ionicons
                name={isEditMode ? "checkmark-circle" : "cloud-upload"}
                size={20}
                color={AppColors.textPrimary}
              />
              <Text style={styles.publishButtonText}>
                {isEditMode ? 'Update' : 'Publish'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Mind':
      return AppColors.mind;
    case 'Body':
      return AppColors.body;
    case 'Soul':
      return AppColors.soul;
    default:
      return AppColors.primary;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 100,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: AppColors.surface,
  },
  progressBar: {
    height: 8,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
  },
  progressText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: AppColors.border,
  },
  optionCardSelected: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.surfaceSecondary,
  },
  optionIcon: {
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  optionLabelSelected: {
    color: AppColors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  exerciseCount: {
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  exerciseCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  selectedExercisesContainer: {
    marginBottom: 16,
    gap: 8,
  },
  selectedExerciseCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedExerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.primary,
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  selectedExerciseInfo: {
    flex: 1,
  },
  selectedExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  selectedExerciseDuration: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: AppColors.primary,
    borderStyle: 'dashed',
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.inputBackground,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  exerciseConfigContainer: {
    flex: 1,
    padding: 24,
  },
  exerciseConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  exerciseConfigTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  exerciseConfigName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  exerciseConfigInstructions: {
    fontSize: 16,
    color: AppColors.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  durationInputContainer: {
    marginBottom: 32,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  durationInput: {
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    fontSize: 18,
    color: AppColors.textPrimary,
  },
  confirmButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  exerciseList: {
    flex: 1,
    padding: 16,
  },
  exerciseListItem: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  exerciseListItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  exerciseListItemInstructions: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  formContainer: {
    gap: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: AppColors.border,
  },
  segmentButtonActive: {
    backgroundColor: AppColors.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  segmentButtonTextActive: {
    color: AppColors.textPrimary,
  },
  reviewContainer: {
    gap: 24,
  },
  reviewSection: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    width: 100,
  },
  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  reviewTagsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  reviewTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3533cd',
  },
  reviewBodyPartChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  reviewBodyPartText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  reviewExercise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  reviewExerciseNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    width: 24,
  },
  reviewExerciseInfo: {
    flex: 1,
  },
  reviewExerciseName: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textPrimary,
  },
  reviewExerciseDuration: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
  },
  nextButtonDisabled: {
    backgroundColor: AppColors.border,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: AppColors.success,
    borderRadius: 12,
  },
  publishButtonDisabled: {
    backgroundColor: AppColors.border,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  advancedTagsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  advancedTagsToggleContent: {
    flex: 1,
  },
  advancedTagsToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  advancedTagsToggleSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  advancedTagsContainer: {
    gap: 12,
    padding: 16,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  fieldHint: {
    fontSize: 12,
    color: AppColors.textTertiary,
    marginTop: -4,
    marginBottom: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginTop: 4,
  },
  dropdownText: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  selectedBodyPartsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedBodyPartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: AppColors.lightGold,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  selectedBodyPartText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.primary,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagTextInput: {
    flex: 1,
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  addTagButton: {
    padding: 4,
  },
  addTagButtonDisabled: {
    opacity: 0.5,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  selectedTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: AppColors.lightGold,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  selectedTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalOptionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  modalOptionTextActive: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  healthTeamBanner: {
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 2,
    borderBottomColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthTeamBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  healthTeamBannerText: {
    flex: 1,
  },
  healthTeamBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  healthTeamBannerSubtitle: {
    fontSize: 13,
    color: '#047857',
  },
  healthTeamToggle: {
    padding: 4,
  },
});
