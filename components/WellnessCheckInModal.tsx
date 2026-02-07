import { AppColors } from '@/constants/theme';
import { getEncouragementMessage, getWellnessLevelInfo, submitPainCheckIn } from '@/lib/utils/pain-checkin';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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

interface WellnessCheckInModalProps {
  visible: boolean;
  userId: string;
  // Optional: pre-populate with avatar names from user profile
  mindName?: string;
  bodyName?: string;
  soulName?: string;
  onComplete: () => void;
}

type Step = 'welcome' | 'mind' | 'body' | 'soul' | 'notes';

// Category colors matching the app theme
const CATEGORY_COLORS = {
  mind: '#3B82F6', // Blue
  body: '#EF4444', // Red
  soul: '#F59E0B', // Amber
};

// Get time-appropriate greeting
const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 17) return 'Good afternoon!';
  return 'Good evening!';
};

export default function WellnessCheckInModal({
  visible,
  userId,
  mindName = 'Mind',
  bodyName = 'Body',
  soulName = 'Soul',
  onComplete,
}: WellnessCheckInModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [mindScore, setMindScore] = useState<number>(0);
  const [bodyScore, setBodyScore] = useState<number>(0);
  const [soulScore, setSoulScore] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState('');
  const [welcomeOpacity] = useState(new Animated.Value(0));

  // Auto-transition from welcome to mind after 3 seconds
  useEffect(() => {
    if (visible && currentStep === 'welcome') {
      // Fade in the welcome screen
      Animated.timing(welcomeOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Auto-advance after 3 seconds
      const timer = setTimeout(() => {
        // Fade out then transition
        Animated.timing(welcomeOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setCurrentStep('mind');
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, currentStep]);

  const getCurrentScore = () => {
    switch (currentStep) {
      case 'mind': return mindScore;
      case 'body': return bodyScore;
      case 'soul': return soulScore;
      default: return 0;
    }
  };

  const getCurrentColor = () => {
    switch (currentStep) {
      case 'mind': return CATEGORY_COLORS.mind;
      case 'body': return CATEGORY_COLORS.body;
      case 'soul': return CATEGORY_COLORS.soul;
      default: return AppColors.primary;
    }
  };

  const getCurrentName = () => {
    switch (currentStep) {
      case 'mind': return mindName;
      case 'body': return bodyName;
      case 'soul': return soulName;
      default: return '';
    }
  };

  const getStepQuestion = () => {
    switch (currentStep) {
      case 'mind':
        return 'How is mental strain affecting your enjoyment of life?';
      case 'body':
        return 'How is physical discomfort affecting your daily activities?';
      case 'soul':
        return 'How much is feeling disconnected affecting your sense of purpose?';
      default:
        return '';
    }
  };

  const handleSliderChange = (value: number) => {
    switch (currentStep) {
      case 'mind':
        setMindScore(value);
        break;
      case 'body':
        setBodyScore(value);
        break;
      case 'soul':
        setSoulScore(value);
        break;
    }
  };

  const handleNext = () => {
    if (currentStep === 'mind') {
      setCurrentStep('body');
    } else if (currentStep === 'body') {
      setCurrentStep('soul');
    } else if (currentStep === 'soul') {
      setCurrentStep('notes');
    }
  };

  const handleBack = () => {
    if (currentStep === 'body') {
      setCurrentStep('mind');
    } else if (currentStep === 'soul') {
      setCurrentStep('body');
    } else if (currentStep === 'notes') {
      setCurrentStep('soul');
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      await submitPainCheckIn(userId, mindScore, bodyScore, soulScore, notes || null);

      // Calculate overall score for encouragement
      const overallScore = Math.round((mindScore + bodyScore + soulScore) / 3);
      const message = getEncouragementMessage(overallScore);
      setEncouragementMessage(message);
      setShowEncouragement(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting wellness check-in:', error);
      Alert.alert('Error', 'Failed to submit check-in. Please try again.');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep('welcome');
    setMindScore(0);
    setBodyScore(0);
    setSoulScore(0);
    setNotes('');
    setSubmitting(false);
    setShowEncouragement(false);
    setEncouragementMessage('');
    welcomeOpacity.setValue(0);

    onComplete();
  };

  const wellnessInfo = getWellnessLevelInfo(getCurrentScore());
  const currentColor = getCurrentColor();

  // Get step index for progress indicator
  const getStepIndex = () => {
    switch (currentStep) {
      case 'mind': return 0;
      case 'body': return 1;
      case 'soul': return 2;
      case 'notes': return 3;
      default: return 0;
    }
  };

  if (showEncouragement) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.encouragementOverlay}>
          <View style={styles.encouragementCard}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={AppColors.success}
              style={styles.encouragementIcon}
            />
            <Text style={styles.encouragementText}>{encouragementMessage}</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Welcome intro screen
  if (currentStep === 'welcome') {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.welcomeOverlay}>
          <Animated.View style={[styles.welcomeContent, { opacity: welcomeOpacity }]}>
            <Ionicons
              name="sunny"
              size={64}
              color={AppColors.primary}
              style={styles.welcomeIcon}
            />
            <Text style={styles.welcomeTitle}>{getTimeGreeting()}</Text>
            <Text style={styles.welcomeSubtitle}>
              Let's take a moment to check in with yourself today.
            </Text>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Daily Wellness Check</Text>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressIndicator}>
            {['mind', 'body', 'soul', 'notes'].map((step, index) => (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.progressDot,
                    getStepIndex() >= index && styles.progressDotActive,
                    getStepIndex() >= index && { backgroundColor: index === 3 ? AppColors.primary : CATEGORY_COLORS[step as keyof typeof CATEGORY_COLORS] },
                  ]}
                />
                {index < 3 && (
                  <View
                    style={[
                      styles.progressLine,
                      getStepIndex() > index && styles.progressLineActive,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Category labels under progress dots */}
          <View style={styles.progressLabels}>
            <Text style={[styles.progressLabel, currentStep === 'mind' && { color: CATEGORY_COLORS.mind, fontWeight: '600' }]}>
              {mindName}
            </Text>
            <Text style={[styles.progressLabel, currentStep === 'body' && { color: CATEGORY_COLORS.body, fontWeight: '600' }]}>
              {bodyName}
            </Text>
            <Text style={[styles.progressLabel, currentStep === 'soul' && { color: CATEGORY_COLORS.soul, fontWeight: '600' }]}>
              {soulName}
            </Text>
            <Text style={[styles.progressLabel, currentStep === 'notes' && { color: AppColors.primary, fontWeight: '600' }]}>
              Notes
            </Text>
          </View>

          {/* Step-specific Title - only for score steps */}
          {currentStep !== 'notes' && (
            <Text style={styles.stepTitle}>{getStepQuestion()}</Text>
          )}

          {/* Score Steps (Mind, Body, Soul) */}
          {currentStep !== 'notes' && (
            <View style={styles.section}>
              {/* Avatar Orb Placeholder */}
              <View style={[styles.avatarOrb, { borderColor: currentColor }]}>
                <Ionicons
                  name={currentStep === 'mind' ? 'bulb' : currentStep === 'body' ? 'body' : 'heart'}
                  size={48}
                  color={currentColor}
                />
              </View>

              {/* Score Display */}
              <View style={styles.scoreDisplay}>
                <Text style={[styles.scoreNumber, { color: wellnessInfo.color }]}>
                  {getCurrentScore()}
                </Text>
                <Text style={[styles.scoreLabel, { color: wellnessInfo.color }]}>
                  {wellnessInfo.label}
                </Text>
              </View>

              {/* Slider */}
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={getCurrentScore()}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor={currentColor}
                  maximumTrackTintColor={AppColors.border}
                  thumbTintColor={currentColor}
                />
                <View style={styles.sliderLabels}>
                  <View style={styles.sliderLabel}>
                    <Text style={styles.sliderLabelNumber}>0</Text>
                    <Text style={styles.sliderLabelText}>Not at all</Text>
                  </View>
                  <View style={styles.sliderLabel}>
                    <Text style={styles.sliderLabelNumber}>10</Text>
                    <Text style={styles.sliderLabelText}>Ruining my life</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Notes Step */}
          {currentStep === 'notes' && (
            <View style={styles.notesSection}>
              {/* Summary of scores - Horizontal cards (right after timeline) */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardLeft}>
                    <View style={[styles.summaryDot, { backgroundColor: CATEGORY_COLORS.mind }]} />
                    <Text style={styles.summaryName}>{mindName}</Text>
                  </View>
                  <View style={styles.summaryCardRight}>
                    <Text style={[styles.summaryScore, { color: getWellnessLevelInfo(mindScore).color }]}>
                      {mindScore}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: getWellnessLevelInfo(mindScore).color }]}>
                      {getWellnessLevelInfo(mindScore).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardLeft}>
                    <View style={[styles.summaryDot, { backgroundColor: CATEGORY_COLORS.body }]} />
                    <Text style={styles.summaryName}>{bodyName}</Text>
                  </View>
                  <View style={styles.summaryCardRight}>
                    <Text style={[styles.summaryScore, { color: getWellnessLevelInfo(bodyScore).color }]}>
                      {bodyScore}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: getWellnessLevelInfo(bodyScore).color }]}>
                      {getWellnessLevelInfo(bodyScore).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardLeft}>
                    <View style={[styles.summaryDot, { backgroundColor: CATEGORY_COLORS.soul }]} />
                    <Text style={styles.summaryName}>{soulName}</Text>
                  </View>
                  <View style={styles.summaryCardRight}>
                    <Text style={[styles.summaryScore, { color: getWellnessLevelInfo(soulScore).color }]}>
                      {soulScore}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: getWellnessLevelInfo(soulScore).color }]}>
                      {getWellnessLevelInfo(soulScore).label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes section with title */}
              <View style={styles.notesContainer}>
                <Text style={styles.notesTitle}>Anything else to share?</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any thoughts on how you're feeling today? (optional)"
                  placeholderTextColor={AppColors.textTertiary}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {notes.length}/500 characters
                </Text>
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.stepNavigation}>
            {currentStep !== 'mind' && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                disabled={submitting}
              >
                <Ionicons name="arrow-back" size={20} color={AppColors.textSecondary} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {currentStep !== 'notes' ? (
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: currentColor }]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color={AppColors.primaryText} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={AppColors.primaryText} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={AppColors.primaryText} />
                    <Text style={styles.submitButtonText}>Submit Check-In</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.border,
  },
  progressDotActive: {
    backgroundColor: AppColors.primary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: AppColors.border,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: AppColors.primary,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  progressLabel: {
    fontSize: 11,
    color: AppColors.textTertiary,
    textAlign: 'center',
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOrb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    alignItems: 'center',
  },
  sliderLabelNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  sliderLabelText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  notesSection: {
    flex: 1,
  },
  summaryContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  notesContainer: {
    flex: 1,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryCardRight: {
    alignItems: 'flex-end',
  },
  summaryDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  summaryName: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  summaryScore: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  notesInput: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    fontSize: 16,
    color: AppColors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'right',
    marginTop: 8,
    width: '100%',
  },
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 'auto',
    paddingTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 18,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    minHeight: 56,
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
    paddingVertical: 18,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    minHeight: 56,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primaryText,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    minHeight: 56,
  },
  submitButtonDisabled: {
    backgroundColor: AppColors.border,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.primaryText,
  },
  encouragementOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  encouragementCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
  },
  encouragementIcon: {
    marginBottom: 16,
  },
  encouragementText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
  },
  welcomeOverlay: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeIcon: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
});
