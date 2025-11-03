import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getAvailableExercises,
  publishCustomRoutine,
  validateRoutineData,
} from '@/lib/utils/routine-builder';
import {
  Exercise,
  JourneyFocusOption,
  RoutineBuilderData,
  RoutineBuilderExercise,
  RoutineCategory,
  RoutineDifficulty,
} from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  const { user } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<BuilderStep>('journey');
  const [loading, setLoading] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);

  // Builder state
  const [routineData, setRoutineData] = useState<RoutineBuilderData>({
    name: '',
    description: '',
    category: 'Mind',
    difficulty: 'Beginner',
    journeyFocus: 'Injury Prevention',
    exercises: [],
  });

  useEffect(() => {
    loadExercises();
  }, []);

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
      const routineId = await publishCustomRoutine(user.id, routineData);

      Alert.alert(
        'Success!',
        'Your custom routine has been published!',
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
              });
              setCurrentStep('journey');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error publishing routine:', error);
      Alert.alert('Error', 'Failed to publish routine. Please try again.');
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
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Routine Builder</Text>
        <TouchableOpacity onPress={handleReset}>
          <Ionicons name="refresh" size={24} color="#3533cd" />
        </TouchableOpacity>
      </View>

      {renderProgressBar()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading && currentStep === 'exercises' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3533cd" />
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
                color={selected === option.value ? '#3533cd' : '#666'}
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
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
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
        <Ionicons name="add-circle" size={24} color="#3533cd" />
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
              <Ionicons name="close" size={28} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>

          {selectedExercise ? (
            <View style={styles.exerciseConfigContainer}>
              <View style={styles.exerciseConfigHeader}>
                <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                  <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
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
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <View style={styles.stepNavigation}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
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
  const canProceed = data.name.trim().length > 0 && data.description.trim().length > 0;

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
          placeholderTextColor="#999"
          maxLength={100}
        />

        <Text style={styles.fieldLabel}>Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={data.description}
          onChangeText={(description) => onUpdate({ description })}
          placeholder="Describe your routine..."
          placeholderTextColor="#999"
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
      </View>

      <View style={styles.stepNavigation}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>Review</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
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
}: {
  data: RoutineBuilderData;
  onPublish: () => void;
  onBack: () => void;
  loading: boolean;
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
          <Text style={styles.reviewSectionTitle}>Basic Info</Text>
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
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          onPress={onPublish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.publishButtonText}>Publish</Text>
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
      return '#3B82F6';
    case 'Body':
      return '#EF4444';
    case 'Soul':
      return '#F59E0B';
    default:
      return '#3533cd';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 100,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3533cd',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#eee',
  },
  optionCardSelected: {
    borderColor: '#3533cd',
    backgroundColor: '#f0f0ff',
  },
  optionIcon: {
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  optionLabelSelected: {
    color: '#3533cd',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  exerciseCount: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  exerciseCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3533cd',
  },
  selectedExercisesContainer: {
    marginBottom: 16,
    gap: 8,
  },
  selectedExerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
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
    backgroundColor: '#3533cd',
    color: '#fff',
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
    color: '#1a1a1a',
  },
  selectedExerciseDuration: {
    fontSize: 14,
    color: '#666',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3533cd',
    borderStyle: 'dashed',
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3533cd',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
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
    color: '#1a1a1a',
  },
  exerciseConfigName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  exerciseConfigInstructions: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 32,
  },
  durationInputContainer: {
    marginBottom: 32,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  durationInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    fontSize: 18,
    color: '#1a1a1a',
  },
  confirmButton: {
    backgroundColor: '#3533cd',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  exerciseList: {
    flex: 1,
    padding: 16,
  },
  exerciseListItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseListItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  exerciseListItemInstructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  formContainer: {
    gap: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  segmentButtonActive: {
    backgroundColor: '#3533cd',
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  segmentButtonTextActive: {
    color: '#fff',
  },
  reviewContainer: {
    gap: 24,
  },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
    color: '#666',
    width: 100,
  },
  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
    color: '#666',
    width: 24,
  },
  reviewExerciseInfo: {
    flex: 1,
  },
  reviewExerciseName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  reviewExerciseDuration: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#3533cd',
    borderRadius: 12,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#34C759',
    borderRadius: 12,
  },
  publishButtonDisabled: {
    backgroundColor: '#ccc',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
