import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { getRoutineById } from '@/lib/utils/dashboard';
import { supabase } from '@/lib/supabase/client';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableExerciseList from '@/components/DraggableExerciseList';
import ExerciseLibrary from '@/components/ExerciseLibrary';
import ExerciseEditorModal from '@/components/ExerciseEditorModal';
import type { ExerciseLibraryItem } from '@/types';

type BuilderStep = 'journey' | 'exercises' | 'metadata' | 'review';
type BuildMode = 'select' | 'routine' | 'exercise';

export default function RoutineBuilderScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [buildMode, setBuildMode] = useState<BuildMode>('select');
  const [currentStep, setCurrentStep] = useState<BuilderStep>('journey');
  const [loading, setLoading] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [isEditingOfficialRoutine, setIsEditingOfficialRoutine] = useState(false);
  const [isHealthTeam, setIsHealthTeam] = useState(false);
  const [checkingHealthTeam, setCheckingHealthTeam] = useState(true); // Loading state for health team check
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedRoutineType, setSelectedRoutineType] = useState<'official' | 'community' | null>(null);

  // Exercise library state
  const [exerciseEditorVisible, setExerciseEditorVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);
  const [exerciseRefreshKey, setExerciseRefreshKey] = useState(0);

  // Builder state
  const [routineData, setRoutineData] = useState<RoutineBuilderData>({
    name: '',
    description: '',
    category: 'Mind',
    difficulty: 'Beginner',
    journeyFocus: 'Injury Prevention',
    exercises: [],
    body_parts: [],
    benefits: [],
  });

  useEffect(() => {
    loadExercises();
    checkHealthTeamStatus();
    if (editId) {
      loadRoutineForEditing(editId);
    }
  }, [editId]);

  const checkHealthTeamStatus = async () => {
    if (!user) {
      setCheckingHealthTeam(false);
      return;
    }

    const healthTeamStatus = await isHealthTeamMember(user.id);
    setIsHealthTeam(healthTeamStatus);

    // Only skip mode selection for non-health team users or when editing
    if (!healthTeamStatus) {
      // Regular users go straight to routine builder
      setBuildMode('routine');
    } else if (editId) {
      // Health team editing a routine goes to routine builder
      setBuildMode('routine');
    }
    // Health team users not editing stay on mode selection ('select')

    setCheckingHealthTeam(false);
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

      // Check if user can edit this routine
      const canEditCustom = routine.is_custom && routine.created_by === user.id;
      const canEditOfficial = routine.author_type === 'official' && await isHealthTeamMember(user.id);

      if (!canEditCustom && !canEditOfficial) {
        Alert.alert(
          'Cannot Edit',
          'You can only edit your own custom routines, or official routines if you are a Health Team member.'
        );
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
        body_parts: routine.body_parts || [],
        benefits: routine.benefits || [],
      });

      setIsEditMode(true);
      setEditingRoutineId(routineId);
      setIsEditingOfficialRoutine(routine.author_type === 'official');

      // Show delete option for health team editing official routines
      if (routine.author_type === 'official' && canEditOfficial) {
        Alert.alert(
          'Edit Official Routine',
          `You are about to edit "${routine.name}". Would you like to edit or delete this routine?`,
          [
            {
              text: 'Delete Routine',
              style: 'destructive',
              onPress: () => handleDeleteRoutine(routineId, routine.name),
            },
            {
              text: 'Edit Routine',
              onPress: () => setCurrentStep('journey'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => router.replace('/(tabs)/routines'),
            },
          ]
        );
      } else {
        setCurrentStep('journey');
      }
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
                        body_parts: [],
              benefits: [],
            });
            setCurrentStep('journey');
          },
        },
      ]
    );
  };

  const handleDeleteRoutine = async (routineId: string, routineName: string) => {
    Alert.alert(
      'Delete Official Routine?',
      `Are you sure you want to permanently delete "${routineName}"? This action cannot be undone and will remove it from Discover for all users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const { error, count } = await supabase
                .from('routines')
                .delete({ count: 'exact' })
                .eq('id', routineId);

              if (error) {
                console.error('Error deleting routine:', error);
                Alert.alert(
                  'Delete Failed',
                  `Could not delete routine: ${error.message}. You may need admin permissions.`
                );
                return;
              }

              if (count === 0) {
                Alert.alert(
                  'Delete Failed',
                  'No routine was deleted. You may not have permission to delete this routine.'
                );
                return;
              }

              Alert.alert(
                'Routine Deleted',
                `"${routineName}" has been permanently deleted.`,
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(tabs)/routines'),
                  },
                ]
              );
            } catch (error) {
              console.error('Error deleting routine:', error);
              Alert.alert('Error', 'Failed to delete routine. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExit = () => {
    Alert.alert(
      'Exit Editor?',
      isEditMode
        ? 'Your changes will not be saved. Are you sure you want to exit?'
        : 'Your progress will be lost. Are you sure you want to exit?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            if (isEditMode && editingRoutineId) {
              // Return to the routine detail page
              router.replace(`/routines/${editingRoutineId}`);
            } else {
              // Return to routines tab
              router.replace('/(tabs)/routines');
            }
          },
        },
      ]
    );
  };

  // Exercise library handlers
  const handleAddExercise = () => {
    setSelectedExercise(null);
    setExerciseEditorVisible(true);
  };

  const handleEditExercise = (exercise: ExerciseLibraryItem) => {
    setSelectedExercise(exercise);
    setExerciseEditorVisible(true);
  };

  const handleExerciseSaved = () => {
    setExerciseRefreshKey(prev => prev + 1); // Refresh the exercise library
    setSelectedExercise(null);
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

    // For health_team users creating new routines, show modal to choose type
    if (isHealthTeam && !isEditMode) {
      setShowPublishModal(true);
      return;
    }

    // For everyone else, proceed with publishing
    await publishRoutine(false);
  };

  const publishRoutine = async (createAsOfficial: boolean) => {
    if (!user) return;

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
                                body_parts: [],
                  benefits: [],
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
      setShowPublishModal(false);
      setSelectedRoutineType(null);
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
            isEditMode={isEditMode}
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
            isEditMode={isEditMode}
          />
        );
      case 'metadata':
        return (
          <MetadataStep
            data={routineData}
            onUpdate={(data) => setRoutineData({ ...routineData, ...data })}
            onNext={() => setCurrentStep('review')}
            onBack={() => setCurrentStep('exercises')}
            isEditMode={isEditMode}
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

  // Show loading while checking health team status
  if (checkingHealthTeam) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <Text style={styles.title}>Build</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </View>
    );
  }

  // Mode selection screen for health team
  if (buildMode === 'select' && isHealthTeam && !editId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <Text style={styles.title}>Build</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.modeSelectionContainer}>
          <Text style={styles.modeSelectionTitle}>What would you like to build?</Text>
          <Text style={styles.modeSelectionSubtitle}>
            Create new exercises for the library or build complete routines
          </Text>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setBuildMode('exercise')}
          >
            <View style={styles.modeIconContainer}>
              <Ionicons name="fitness" size={48} color={AppColors.primary} />
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Exercise Library</Text>
              <Text style={styles.modeDescription}>
                Create and manage individual exercises that can be used in routines
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={AppColors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setBuildMode('routine')}
          >
            <View style={styles.modeIconContainer}>
              <Ionicons name="list" size={48} color={AppColors.primary} />
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Routine Builder</Text>
              <Text style={styles.modeDescription}>
                Build complete routines by combining exercises together
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={AppColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Exercise library management for health team
  if (buildMode === 'exercise' && isHealthTeam) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setBuildMode('select')}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={28} color={AppColors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Exercise Library</Text>
          <TouchableOpacity
            onPress={handleAddExercise}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={28} color={AppColors.primary} />
          </TouchableOpacity>
        </View>

        {/* Exercise Library */}
        <View style={styles.exerciseLibraryContainer}>
          <ExerciseLibrary
            key={exerciseRefreshKey}
            onEditExercise={handleEditExercise}
            onDeleteExercise={(exerciseId) => {
              setExerciseRefreshKey(prev => prev + 1);
            }}
            allowSelection={false}
            allowEditing={true}
            allowDeleting={true}
            showOfficialOnly={false}
          />
        </View>

        {/* Exercise Editor Modal */}
        <ExerciseEditorModal
          visible={exerciseEditorVisible}
          onClose={() => {
            setExerciseEditorVisible(false);
            setSelectedExercise(null);
          }}
          onSave={handleExerciseSaved}
          exercise={selectedExercise}
          userId={user!.id}
          isHealthTeam={isHealthTeam}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.headerButton}>
          <Ionicons name="close" size={28} color={AppColors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditMode
            ? isEditingOfficialRoutine
              ? 'Edit Official Routine'
              : 'Edit Routine'
            : 'Routine Builder'}
        </Text>
        {!isEditMode && (
          <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color={AppColors.primary} />
          </TouchableOpacity>
        )}
        {isEditMode && <View style={styles.headerButton} />}
      </View>

      {renderProgressBar()}

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
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

      {/* Routine Type Selection Modal */}
      <Modal
        visible={showPublishModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPublishModal(false)}
      >
        <View style={styles.publishModalOverlay}>
          <View style={styles.publishModalContent}>
            <View style={styles.publishModalHeader}>
              <Ionicons name="shield-checkmark" size={32} color="#10B981" />
              <Text style={styles.publishModalTitle}>Choose Routine Type</Text>
              <Text style={styles.publishModalSubtitle}>
                How would you like to publish this routine?
              </Text>
            </View>

            <View style={styles.publishModalOptions}>
              <TouchableOpacity
                style={styles.publishModalOption}
                onPress={() => {
                  setSelectedRoutineType('official');
                  publishRoutine(true);
                }}
                disabled={loading}
              >
                <View style={styles.publishModalOptionIcon}>
                  <Ionicons name="shield-checkmark" size={36} color="#10B981" />
                </View>
                <View style={styles.publishModalOptionContent}>
                  <Text style={styles.publishModalOptionTitle}>Official Soteria Routine</Text>
                  <Text style={styles.publishModalOptionDescription}>
                    Will be published to Discover as official content. Visible to all users as curated by Soteria Health Team.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#10B981" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.publishModalOption}
                onPress={() => {
                  setSelectedRoutineType('community');
                  publishRoutine(false);
                }}
                disabled={loading}
              >
                <View style={styles.publishModalOptionIcon}>
                  <Ionicons name="people" size={36} color={AppColors.primary} />
                </View>
                <View style={styles.publishModalOptionContent}>
                  <Text style={styles.publishModalOptionTitle}>Personal Community Routine</Text>
                  <Text style={styles.publishModalOptionDescription}>
                    Will be saved to your personal routines. You can share it with friends or keep it private.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={AppColors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.publishModalCancelButton}
              onPress={() => {
                setShowPublishModal(false);
                setSelectedRoutineType(null);
              }}
              disabled={loading}
            >
              <Text style={styles.publishModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

// Step 1: Journey Focus Selection
function JourneyFocusStep({
  selected,
  onSelect,
  isEditMode,
}: {
  selected: JourneyFocusOption;
  onSelect: (focus: JourneyFocusOption) => void;
  isEditMode?: boolean;
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
      <Text style={styles.stepTitle}>
        {isEditMode ? 'Update Journey Focus' : "What's your journey focus?"}
      </Text>
      <Text style={styles.stepSubtitle}>
        {isEditMode
          ? `Current focus: ${selected}. Choose a new focus or tap Continue.`
          : 'This helps us categorize your routine for other users'}
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
            <View style={styles.optionHeader}>
              <Ionicons
                name={option.icon as any}
                size={28}
                color={selected === option.value ? AppColors.primary : AppColors.textSecondary}
              />
              <Text style={[
                styles.optionLabel,
                selected === option.value && styles.optionLabelSelected,
              ]}>
                {option.label}
              </Text>
              {selected === option.value && isEditMode && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </View>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isEditMode && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => onSelect(selected)}
        >
          <Text style={styles.continueButtonText}>Continue with {selected}</Text>
          <Ionicons name="arrow-forward" size={20} color={AppColors.textPrimary} />
        </TouchableOpacity>
      )}
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
  isEditMode,
}: {
  availableExercises: Exercise[];
  selectedExercises: RoutineBuilderExercise[];
  onUpdate: (exercises: RoutineBuilderExercise[]) => void;
  onNext: () => void;
  onBack: () => void;
  isEditMode?: boolean;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLibraryExercise, setSelectedLibraryExercise] = useState<ExerciseLibraryItem | null>(null);
  const [duration, setDuration] = useState('30');
  const [editingExercise, setEditingExercise] = useState<RoutineBuilderExercise | null>(null);

  const handleSelectExerciseFromLibrary = (exercise: ExerciseLibraryItem) => {
    if (selectedExercises.length >= 30) {
      Alert.alert('Limit Reached', 'Maximum 30 exercises allowed per routine');
      return;
    }

    // Set the selected exercise and default duration
    setSelectedLibraryExercise(exercise);
    setDuration(exercise.default_duration_seconds.toString());
  };

  const handleAddExercise = () => {
    if (!selectedLibraryExercise) return;

    const durationSeconds = parseInt(duration, 10);
    if (isNaN(durationSeconds) || durationSeconds <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in seconds');
      return;
    }

    const newExercise: RoutineBuilderExercise = {
      name: selectedLibraryExercise.name,
      instructions: selectedLibraryExercise.instructions,
      duration_seconds: durationSeconds,
      demo_image_url: selectedLibraryExercise.demo_image_url,
      id: `${Date.now()}-${Math.random()}`,
    };

    onUpdate([...selectedExercises, newExercise]);
    setModalVisible(false);
    setSelectedLibraryExercise(null);
    setDuration('30');
  };

  const handleEditExercise = (exercise: RoutineBuilderExercise) => {
    setEditingExercise(exercise);
    setDuration(exercise.duration_seconds.toString());
  };

  const handleUpdateExercise = () => {
    if (!editingExercise) return;

    const durationSeconds = parseInt(duration, 10);
    if (isNaN(durationSeconds) || durationSeconds <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in seconds');
      return;
    }

    const updatedExercises = selectedExercises.map(ex =>
      ex.id === editingExercise.id
        ? { ...ex, duration_seconds: durationSeconds }
        : ex
    );
    onUpdate(updatedExercises);
    setEditingExercise(null);
    setDuration('30');
  };

  const handleRemoveExercise = (id: string) => {
    onUpdate(selectedExercises.filter((ex) => ex.id !== id));
  };

  const canProceed = selectedExercises.length > 0 && selectedExercises.length <= 30;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {isEditMode ? 'Edit Exercises' : 'Add Exercises'}
      </Text>
      <Text style={styles.stepSubtitle}>
        {isEditMode
          ? 'Tap to edit duration or reorder exercises. Add or remove as needed.'
          : 'Select exercises and set their duration'}
      </Text>

      <View style={styles.exerciseCount}>
        <Text style={styles.exerciseCountText}>
          {selectedExercises.length}/30 exercises
        </Text>
      </View>

      {selectedExercises.length > 0 && (
        <DraggableExerciseList
          exercises={selectedExercises}
          onReorder={onUpdate}
          onEdit={handleEditExercise}
          onRemove={handleRemoveExercise}
          isEditMode={isEditMode}
        />
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
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedLibraryExercise(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setSelectedLibraryExercise(null);
              }}
            >
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedLibraryExercise ? 'Set Duration' : 'Select Exercise'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {selectedLibraryExercise ? (
            <View style={styles.exerciseConfigContainer}>
              <View style={styles.exerciseConfigHeader}>
                <TouchableOpacity onPress={() => setSelectedLibraryExercise(null)}>
                  <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.exerciseConfigTitle}>Set Duration</Text>
                <View style={{ width: 24 }} />
              </View>

              <Text style={styles.exerciseConfigName}>{selectedLibraryExercise.name}</Text>
              <Text style={styles.exerciseConfigInstructions}>
                {selectedLibraryExercise.instructions}
              </Text>

              <View style={styles.durationInputContainer}>
                <Text style={styles.durationLabel}>Duration (seconds)</Text>
                <Text style={styles.fieldHint}>
                  Default: {selectedLibraryExercise.default_duration_seconds}s
                </Text>
                <TextInput
                  style={styles.durationInput}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  placeholder={selectedLibraryExercise.default_duration_seconds.toString()}
                />
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={handleAddExercise}>
                <Text style={styles.confirmButtonText}>Add to Routine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.exerciseLibraryModalContainer}>
              <ExerciseLibrary
                onSelectExercise={handleSelectExerciseFromLibrary}
                allowSelection={true}
                allowEditing={false}
                showOfficialOnly={true}
              />
            </View>
          )}
        </View>
      </Modal>

      {/* Edit Exercise Duration Modal */}
      <Modal
        visible={editingExercise !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingExercise(null)}
      >
        <View style={styles.editDurationModalOverlay}>
          <View style={styles.editDurationModalContent}>
            <View style={styles.editDurationModalHeader}>
              <Ionicons name="time-outline" size={28} color={AppColors.primary} />
              <Text style={styles.editDurationModalTitle}>Edit Duration</Text>
            </View>

            {editingExercise && (
              <>
                <Text style={styles.editDurationExerciseName}>{editingExercise.name}</Text>
                <Text style={styles.editDurationCurrentValue}>
                  Current: {editingExercise.duration_seconds}s
                </Text>

                <View style={styles.durationInputContainer}>
                  <Text style={styles.durationLabel}>New Duration (seconds)</Text>
                  <TextInput
                    style={styles.durationInput}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="number-pad"
                    placeholder="30"
                    autoFocus
                  />
                </View>

                <View style={styles.editDurationModalActions}>
                  <TouchableOpacity
                    style={styles.editDurationCancelButton}
                    onPress={() => {
                      setEditingExercise(null);
                      setDuration('30');
                    }}
                  >
                    <Text style={styles.editDurationCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editDurationSaveButton}
                    onPress={handleUpdateExercise}
                  >
                    <Text style={styles.editDurationSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
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
  isEditMode,
}: {
  data: RoutineBuilderData;
  onUpdate: (data: Partial<RoutineBuilderData>) => void;
  onNext: () => void;
  onBack: () => void;
  isEditMode?: boolean;
}) {
  const [bodyRegionFilter, setBodyRegionFilter] = useState<BodyRegion>('All');
  const [bodyPartsModalVisible, setBodyPartsModalVisible] = useState(false);
  const [currentBenefitInput, setCurrentBenefitInput] = useState('');
  const canProceed = data.name.trim().length > 0 && data.description.trim().length > 0;

  const MAX_BENEFITS = 4;

  const handleAddBenefit = () => {
    const trimmedBenefit = currentBenefitInput.trim();

    // Validation
    if (!trimmedBenefit) return;

    if (trimmedBenefit.length < 5) {
      Alert.alert('Invalid Benefit', 'Benefit must be at least 5 characters long.');
      return;
    }

    if (trimmedBenefit.length > 100) {
      Alert.alert('Invalid Benefit', 'Benefit must be less than 100 characters.');
      return;
    }

    if (data.benefits && data.benefits.length >= MAX_BENEFITS) {
      Alert.alert('Maximum Benefits Reached', `You can only add up to ${MAX_BENEFITS} benefits per routine.`);
      return;
    }

    if (data.benefits && data.benefits.includes(trimmedBenefit)) {
      Alert.alert('Duplicate Benefit', 'This benefit has already been added.');
      return;
    }

    // Add benefit
    const currentBenefits = data.benefits || [];
    onUpdate({ benefits: [...currentBenefits, trimmedBenefit] });
    setCurrentBenefitInput('');
  };

  const handleRemoveBenefit = (benefitToRemove: string) => {
    const currentBenefits = data.benefits || [];
    onUpdate({ benefits: currentBenefits.filter(benefit => benefit !== benefitToRemove) });
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
          {(['Mind', 'Body', 'Soul'] as RoutineCategory[]).map((category) => {
            const categoryColor = category === 'Mind' ? AppColors.mind : category === 'Body' ? AppColors.body : AppColors.soul;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.segmentButton,
                  data.category === category && { backgroundColor: categoryColor },
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
            );
          })}
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

        {/* Body Parts Section (only for Body category) */}
        {data.category === 'Body' && (
          <>
            <Text style={styles.fieldLabel}>Body Parts</Text>
            <Text style={styles.fieldHint}>Select body parts targeted by this routine</Text>

            {/* Body Parts Dropdown */}
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
          </>
        )}

        {/* Benefits Section */}
        <Text style={styles.fieldLabel}>Benefits (Max {MAX_BENEFITS})</Text>
        <Text style={styles.fieldHint}>
          {data.benefits && data.benefits.length >= MAX_BENEFITS
            ? `Maximum of ${MAX_BENEFITS} benefits reached`
            : 'e.g., Reduces stress, Improves flexibility, Increases energy'}
        </Text>

        {/* Benefit Input with Add Button */}
        <View style={styles.tagInputContainer}>
          <TextInput
            style={styles.tagTextInput}
            value={currentBenefitInput}
            onChangeText={setCurrentBenefitInput}
            placeholder="Type a benefit..."
            placeholderTextColor={AppColors.textTertiary}
            maxLength={100}
            editable={!data.benefits || data.benefits.length < MAX_BENEFITS}
            onSubmitEditing={handleAddBenefit}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[
              styles.addTagButton,
              (!currentBenefitInput.trim() || (data.benefits && data.benefits.length >= MAX_BENEFITS)) &&
                styles.addTagButtonDisabled,
            ]}
            onPress={handleAddBenefit}
            disabled={!currentBenefitInput.trim() || (data.benefits && data.benefits.length >= MAX_BENEFITS)}
          >
            <Ionicons
              name="add-circle"
              size={32}
              color={
                !currentBenefitInput.trim() || (data.benefits && data.benefits.length >= MAX_BENEFITS)
                  ? AppColors.border
                  : AppColors.primary
              }
            />
          </TouchableOpacity>
        </View>

        {/* Display Selected Benefits as Chips (same pattern as tags) */}
        {data.benefits && data.benefits.length > 0 && (
          <View style={styles.selectedTagsContainer}>
            {data.benefits.map((benefit, index) => (
              <View key={`${benefit}-${index}`} style={styles.selectedTagChip}>
                <Text style={styles.selectedTagText}>{benefit}</Text>
                <TouchableOpacity onPress={() => handleRemoveBenefit(benefit)}>
                  <Ionicons name="close-circle" size={18} color={AppColors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

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

            {/* Body Region Filter */}
            <View style={styles.filterContainer}>
              {(['All', 'Upper Body', 'Lower Body'] as BodyRegion[]).map((region) => (
                <TouchableOpacity
                  key={region}
                  style={[
                    styles.filterButton,
                    bodyRegionFilter === region && styles.filterButtonActive,
                  ]}
                  onPress={() => setBodyRegionFilter(region)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      bodyRegionFilter === region && styles.filterButtonTextActive,
                    ]}
                  >
                    {region}
                  </Text>
                </TouchableOpacity>
              ))}
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

          {/* Display Benefits if present */}
          {data.benefits && data.benefits.length > 0 && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Benefits:</Text>
              <View style={styles.reviewTagsContainer}>
                {data.benefits.map((benefit, index) => (
                  <View key={`${benefit}-${index}`} style={styles.reviewBenefitChip}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.reviewBenefitText}>{benefit}</Text>
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
  // Mode selection styles
  modeSelectionContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  modeSelectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  modeSelectionSubtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  placeholder: {
    fontSize: 18,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  modeBackButton: {
    padding: 16,
    alignItems: 'center',
  },
  modeBackButtonText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  exerciseLibraryContainer: {
    flex: 1,
    padding: 16,
  },
  exerciseLibraryModalContainer: {
    flex: 1,
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
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 32,
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
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  optionLabelSelected: {
    color: AppColors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    paddingLeft: 40,
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
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  filterButtonTextActive: {
    color: AppColors.textPrimary,
    fontWeight: '600',
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
    gap: 16,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
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
  publishModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  publishModalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  publishModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  publishModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  publishModalSubtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  publishModalOptions: {
    gap: 16,
    marginBottom: 24,
  },
  publishModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: AppColors.border,
    gap: 16,
  },
  publishModalOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishModalOptionContent: {
    flex: 1,
  },
  publishModalOptionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  publishModalOptionDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  publishModalCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: AppColors.background,
  },
  publishModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  currentBadge: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    marginTop: 16,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  editDurationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  editDurationModalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  editDurationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  editDurationModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  editDurationExerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  editDurationCurrentValue: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 20,
  },
  editDurationModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  editDurationCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  editDurationCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  editDurationSaveButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: AppColors.primary,
  },
  editDurationSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  benefitsSeparator: {
    height: 1,
    backgroundColor: AppColors.borderLight,
    marginVertical: 16,
  },
  reviewBenefitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  reviewBenefitText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#047857',
  },
});
