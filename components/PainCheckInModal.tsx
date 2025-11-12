import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { PAIN_LOCATIONS, PainLocation } from '@/types';
import { submitPainCheckIn, getPainLevelInfo, getEncouragementMessage } from '@/lib/utils/pain-checkin';

interface PainCheckInModalProps {
  visible: boolean;
  userId: string;
  onComplete: () => void;
}

type Step = 'pain' | 'locations' | 'notes';

export default function PainCheckInModal({ visible, userId, onComplete }: PainCheckInModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('pain');
  const [painLevel, setPainLevel] = useState<number>(0); // Start at 0 (Pain Free)
  const [hasInteracted, setHasInteracted] = useState(true); // Show initial value immediately
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState('');
  const [showLocationsModal, setShowLocationsModal] = useState(false);

  const painInfo = hasInteracted ? getPainLevelInfo(painLevel) : null;

  const handleToggleLocation = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location)
        ? prev.filter((l) => l !== location)
        : [...prev, location]
    );
  };

  const handleNext = () => {
    if (currentStep === 'pain') {
      setCurrentStep('locations');
    } else if (currentStep === 'locations') {
      setCurrentStep('notes');
    }
  };

  const handleBack = () => {
    if (currentStep === 'locations') {
      setCurrentStep('pain');
    } else if (currentStep === 'notes') {
      setCurrentStep('locations');
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      await submitPainCheckIn(userId, painLevel, selectedLocations, notes || null);

      // Show encouragement message
      const message = getEncouragementMessage(painLevel);
      setEncouragementMessage(message);
      setShowEncouragement(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting pain check-in:', error);
      Alert.alert('Error', 'Failed to submit check-in. Please try again.');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep('pain');
    setPainLevel(0);
    setHasInteracted(true);
    setSelectedLocations([]);
    setNotes('');
    setSubmitting(false);
    setShowEncouragement(false);
    setEncouragementMessage('');

    onComplete();
  };

  const handleSliderChange = (value: number) => {
    setPainLevel(value);
    if (!hasInteracted) {
      setHasInteracted(true);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Daily Pain Check</Text>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressIndicator}>
            <View style={[styles.progressDot, currentStep === 'pain' && styles.progressDotActive]} />
            <View style={[styles.progressLine, (currentStep === 'locations' || currentStep === 'notes') && styles.progressLineActive]} />
            <View style={[styles.progressDot, (currentStep === 'locations' || currentStep === 'notes') && styles.progressDotActive]} />
            <View style={[styles.progressLine, currentStep === 'notes' && styles.progressLineActive]} />
            <View style={[styles.progressDot, currentStep === 'notes' && styles.progressDotActive]} />
          </View>

          {/* Step-specific Title */}
          <Text style={styles.stepTitle}>
            {currentStep === 'pain' && 'Rate any pain you\'re feeling today'}
            {currentStep === 'locations' && (painLevel === 0 ? 'Any areas of concern?' : 'Where does it hurt?')}
            {currentStep === 'notes' && 'Tell us more'}
          </Text>

          {/* Step 1: Pain Level Slider */}
          {currentStep === 'pain' && (
            <View style={styles.section}>
              {painInfo && (
                <View style={styles.painLevelDisplay}>
                  <Text style={[styles.painLevelNumber, { color: painInfo.color }]}>
                    {painLevel}
                  </Text>
                  <Text style={[styles.painLevelLabel, { color: painInfo.color }]}>
                    {painInfo.label}
                  </Text>
                </View>
              )}

              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={painLevel}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor={painInfo?.color || AppColors.border}
                  maximumTrackTintColor={AppColors.border}
                  thumbTintColor={painInfo?.color || AppColors.textSecondary}
                />
                <View style={styles.sliderLabels}>
                  <View style={styles.sliderLabel}>
                    <Text style={styles.sliderLabelNumber}>0</Text>
                    <Text style={styles.sliderLabelText}>Pain Free</Text>
                  </View>
                  <View style={styles.sliderLabel}>
                    <Text style={styles.sliderLabelNumber}>10</Text>
                    <Text style={styles.sliderLabelText}>Severe</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Pain Locations */}
          {currentStep === 'locations' && (
            <View style={styles.section}>
              <Text style={styles.sectionSubtitle}>Select all that apply (optional)</Text>

              {/* Multi-select Dropdown */}
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowLocationsModal(true)}
              >
                <Text style={styles.dropdownText}>
                  {selectedLocations.length === 0
                    ? 'Select affected areas'
                    : `${selectedLocations.length} area${selectedLocations.length > 1 ? 's' : ''} selected`}
                </Text>
                <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
              </TouchableOpacity>

              {/* Display Selected Locations */}
              {selectedLocations.length > 0 && (
                <View style={styles.selectedLocationsContainer}>
                  {selectedLocations.map((location) => (
                    <View key={location} style={styles.selectedLocationChip}>
                      <Text style={styles.selectedLocationText}>{location}</Text>
                      <TouchableOpacity onPress={() => handleToggleLocation(location)}>
                        <Ionicons name="close-circle" size={18} color={AppColors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Step 3: Optional Notes */}
          {currentStep === 'notes' && (
            <View style={styles.section}>
              <Text style={styles.sectionSubtitle}>
                Any additional details that might help (optional)
              </Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="E.g., what activities triggered it, how it feels, what helps..."
                placeholderTextColor={AppColors.textTertiary}
                multiline
                numberOfLines={6}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {notes.length}/500 characters
              </Text>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.stepNavigation}>
            {currentStep !== 'pain' && (
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
                style={styles.nextButton}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color={AppColors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={AppColors.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={AppColors.textPrimary} />
                    <Text style={styles.submitButtonText}>Submit Check-In</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Pain Locations Multi-Select Modal */}
      <Modal
        visible={showLocationsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationsModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Affected Areas</Text>
              <TouchableOpacity onPress={() => setShowLocationsModal(false)}>
                <Ionicons name="close" size={24} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {PAIN_LOCATIONS.map((location) => {
                const isSelected = selectedLocations.includes(location);
                return (
                  <TouchableOpacity
                    key={location}
                    style={styles.modalOption}
                    onPress={() => handleToggleLocation(location)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextActive,
                      ]}
                    >
                      {location}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: 60,
    paddingBottom: 100, // Extra space for bottom buttons
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
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
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: AppColors.primary,
  },
  section: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 16,
  },
  hintText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  painLevelDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  painLevelNumber: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  painLevelLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  sliderContainer: {
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
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  dropdownText: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  selectedLocationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedLocationChip: {
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
  selectedLocationText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.primary,
  },
  notesInput: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 16,
    fontSize: 16,
    color: AppColors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'right',
    marginTop: 8,
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
    minHeight: 56, // Better touch target
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
    minHeight: 56, // Better touch target
  },
  nextButtonDisabled: {
    backgroundColor: AppColors.border,
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
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
    minHeight: 56, // Better touch target
  },
  submitButtonDisabled: {
    backgroundColor: AppColors.border,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  footerNote: {
    fontSize: 14,
    color: AppColors.textTertiary,
    textAlign: 'center',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
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
});
