import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import SoteriaPresence from './components/SoteriaPresence';
import SoteriaDialogueBox from './components/SoteriaDialogueBox';
import { AppColors } from '@/constants/theme';
import { JourneyFocus } from '@/types';
import { useFilterOptions } from '@/lib/contexts/FilterOptionsContext';

// Recovery category definitions
const RECOVERY_CATEGORIES = [
  {
    id: 'Mind',
    label: 'Mind',
    icon: 'bulb-outline' as const,
    color: AppColors.mind,
    description: 'Mental wellness & stress recovery',
  },
  {
    id: 'Body',
    label: 'Body',
    icon: 'body-outline' as const,
    color: AppColors.body,
    description: 'Physical recovery from injury',
  },
  {
    id: 'Soul',
    label: 'Soul',
    icon: 'sparkles-outline' as const,
    color: AppColors.soul,
    description: 'Emotional & spiritual healing',
  },
];

// Screen 3: Journey Focus Selection
export default function JourneyFocusScreen() {
  const router = useRouter();
  const { upperBodyParts, lowerBodyParts } = useFilterOptions();
  const { data, setJourneyFocus, setRecoveryAreas } = useOnboarding();
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showBodyPartsPicker, setShowBodyPartsPicker] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(data.recoveryAreas || []);

  // Show recovery modal if navigating to this screen with Recovery already selected
  // (e.g., using dev navigation or going back)
  useEffect(() => {
    if (data.journeyFocus === 'Recovery' && data.recoveryAreas.length === 0) {
      // Recovery is selected but no areas chosen yet - show modal
      setShowRecoveryModal(true);
    } else if (data.journeyFocus === 'Recovery' && data.recoveryAreas.length > 0) {
      // Recovery areas already set - initialize local state
      setSelectedAreas(data.recoveryAreas);
    }
  }, []);

  // Check if a recovery category is selected
  const isCategorySelected = (categoryId: string): boolean => {
    if (categoryId === 'Mind' || categoryId === 'Soul') {
      return selectedAreas.includes(categoryId);
    }
    const bodyParts = [...upperBodyParts, ...lowerBodyParts];
    return selectedAreas.some(area => bodyParts.includes(area as typeof bodyParts[number]));
  };

  // Get selected body parts
  const getSelectedBodyParts = (): string[] => {
    const bodyParts = [...upperBodyParts, ...lowerBodyParts];
    return selectedAreas.filter(area => bodyParts.includes(area as typeof bodyParts[number]));
  };

  // Toggle a recovery category
  const toggleCategory = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (categoryId === 'Mind' || categoryId === 'Soul') {
      setSelectedAreas(prev =>
        prev.includes(categoryId)
          ? prev.filter(a => a !== categoryId)
          : [...prev, categoryId]
      );
    } else if (categoryId === 'Body') {
      setShowBodyPartsPicker(true);
    }
  };

  // Toggle a body part
  const toggleBodyPart = (part: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAreas(prev =>
      prev.includes(part)
        ? prev.filter(a => a !== part)
        : [...prev, part]
    );
  };

  // Clear all body parts
  const clearBodyParts = () => {
    const bodyParts = [...upperBodyParts, ...lowerBodyParts];
    setSelectedAreas(prev => prev.filter(a => !bodyParts.includes(a as typeof bodyParts[number])));
  };

  const handleSelect = (focus: JourneyFocus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJourneyFocus(focus);

    if (focus === 'Recovery') {
      // Show recovery areas modal
      setShowRecoveryModal(true);
    } else {
      // Injury Prevention users go straight to the next step
      router.push('/onboarding/three-lights');
    }
  };

  const handleRecoveryContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecoveryAreas(selectedAreas);
    setShowRecoveryModal(false);
    router.push('/onboarding/three-lights');
  };

  const handleRecoveryCancel = () => {
    setShowRecoveryModal(false);
    setSelectedAreas([]);
    // Reset journey focus since they cancelled
    setJourneyFocus(null as unknown as JourneyFocus);
  };

  const selectedBodyParts = getSelectedBodyParts();
  const canContinue = selectedAreas.length > 0;

  // Format recovery areas for display
  const formatRecoveryAreas = (): string => {
    const areas: string[] = [];
    if (selectedAreas.includes('Mind')) areas.push('Mind');
    if (selectedBodyParts.length > 0) {
      areas.push(`Body (${selectedBodyParts.join(', ')})`);
    }
    if (selectedAreas.includes('Soul')) areas.push('Soul');
    return areas.join(', ');
  };

  // Check if recovery areas have been selected
  const hasRecoveryAreas = data.journeyFocus === 'Recovery' && data.recoveryAreas.length > 0;

  return (
    <SanctumBackground>
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Soteria's presence (smaller) */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence size="small" intensity="low" />
        </View>

        {/* Question or Summary */}
        {hasRecoveryAreas ? (
          <View style={styles.dialogueContainer}>
            <SoteriaDialogueBox
              text={`Your healing journey focuses on: ${formatRecoveryAreas()}`}
              glowPosition="top"
            />
          </View>
        ) : (
          <Text style={styles.question}>What are you seeking?</Text>
        )}

        {/* Choice buttons */}
        <View style={styles.choicesContainer}>
          <TouchableOpacity
            style={[
              styles.choiceButton,
              data.journeyFocus === 'Injury Prevention' && styles.choiceButtonSelected,
            ]}
            onPress={() => handleSelect('Injury Prevention')}
          >
            <View style={styles.choiceIconContainer}>
              <Ionicons name="shield-checkmark" size={32} color="#3B82F6" />
            </View>
            <View style={styles.choiceTextContainer}>
              <Text style={styles.choiceTitle}>Injury Prevention</Text>
              <Text style={styles.choiceDescription}>
                Build strength before you need it
              </Text>
            </View>
            {data.journeyFocus === 'Injury Prevention' && (
              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.choiceButton,
              data.journeyFocus === 'Recovery' && styles.choiceButtonSelected,
            ]}
            onPress={() => handleSelect('Recovery')}
          >
            <View style={styles.choiceIconContainer}>
              <Ionicons name="heart" size={32} color="#EF4444" />
            </View>
            <View style={styles.choiceTextContainer}>
              <Text style={styles.choiceTitle}>Recovery</Text>
              <Text style={styles.choiceDescription}>
                Rebuild and heal the right way
              </Text>
              {hasRecoveryAreas && (
                <Text style={styles.editHint}>Tap to edit recovery areas</Text>
              )}
            </View>
            {data.journeyFocus === 'Recovery' && (
              <Ionicons name="checkmark-circle" size={24} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Recovery Areas Modal */}
      <Modal
        visible={showRecoveryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleRecoveryCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recovery Areas</Text>
              <Text style={styles.modalSubtitle}>
                Where does your healing journey need to focus?
              </Text>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Recovery Categories */}
              {RECOVERY_CATEGORIES.map((category) => {
                const isSelected = isCategorySelected(category.id);
                const isBody = category.id === 'Body';

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      isSelected && { borderColor: category.color },
                    ]}
                    onPress={() => toggleCategory(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryContent}>
                      <View
                        style={[
                          styles.categoryIconContainer,
                          { backgroundColor: category.color + '20' },
                        ]}
                      >
                        <Ionicons
                          name={category.icon}
                          size={28}
                          color={category.color}
                        />
                      </View>
                      <View style={styles.categoryTextContainer}>
                        <Text style={styles.categoryLabel}>{category.label}</Text>
                        <Text style={styles.categoryDescription}>
                          {category.description}
                        </Text>
                        {isBody && isSelected && selectedBodyParts.length > 0 && (
                          <Text style={styles.selectedBodyParts}>
                            {selectedBodyParts.join(', ')}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && { backgroundColor: category.color, borderColor: category.color },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        )}
                      </View>
                    </View>
                    {isBody && isSelected && (
                      <TouchableOpacity
                        style={styles.editBodyPartsButton}
                        onPress={() => setShowBodyPartsPicker(true)}
                      >
                        <Ionicons name="pencil" size={14} color={AppColors.primary} />
                        <Text style={styles.editBodyPartsText}>
                          {selectedBodyParts.length === 0 ? 'Select Body Parts' : 'Edit Body Parts'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Helper text */}
              {selectedAreas.length === 0 && (
                <Text style={styles.helperText}>
                  Select at least one area to continue
                </Text>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleRecoveryCancel}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  !canContinue && styles.continueButtonDisabled,
                ]}
                onPress={handleRecoveryContinue}
                disabled={!canContinue}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Body Parts Picker Modal - nested inside recovery modal */}
        <Modal
          visible={showBodyPartsPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowBodyPartsPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.bodyPartsModal}>
              <View style={styles.bodyPartsHeader}>
                <Text style={styles.bodyPartsTitle}>Select Body Parts</Text>
                <TouchableOpacity
                  onPress={() => setShowBodyPartsPicker(false)}
                  style={styles.doneButton}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Upper Body */}
                <Text style={styles.bodyRegionTitle}>Upper Body</Text>
                <View style={styles.bodyPartsGrid}>
                  {upperBodyParts.map((part) => {
                    const isSelected = selectedAreas.includes(part);
                    return (
                      <TouchableOpacity
                        key={part}
                        style={[
                          styles.bodyPartChip,
                          isSelected && styles.bodyPartChipSelected,
                        ]}
                        onPress={() => toggleBodyPart(part)}
                      >
                        <Text
                          style={[
                            styles.bodyPartChipText,
                            isSelected && styles.bodyPartChipTextSelected,
                          ]}
                        >
                          {part}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Lower Body */}
                <Text style={styles.bodyRegionTitle}>Lower Body</Text>
                <View style={styles.bodyPartsGrid}>
                  {lowerBodyParts.map((part) => {
                    const isSelected = selectedAreas.includes(part);
                    return (
                      <TouchableOpacity
                        key={part}
                        style={[
                          styles.bodyPartChip,
                          isSelected && styles.bodyPartChipSelected,
                        ]}
                        onPress={() => toggleBodyPart(part)}
                      >
                        <Text
                          style={[
                            styles.bodyPartChipText,
                            isSelected && styles.bodyPartChipTextSelected,
                          ]}
                        >
                          {part}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Clear All Button */}
                {selectedBodyParts.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearAllButton}
                    onPress={clearBodyParts}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={AppColors.textSecondary} />
                    <Text style={styles.clearAllText}>Clear All Body Parts</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
    </SanctumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  presenceContainer: {
    marginBottom: 64,
  },
  question: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
  },
  dialogueContainer: {
    width: '100%',
    marginBottom: 32,
  },
  choicesContainer: {
    width: '100%',
    gap: 16,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  choiceButtonSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  choiceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  choiceDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  editHint: {
    fontSize: 12,
    color: AppColors.primary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: 400,
  },
  categoryCard: {
    padding: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColors.border,
    marginBottom: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  selectedBodyParts: {
    fontSize: 12,
    color: AppColors.body,
    marginTop: 6,
    fontStyle: 'italic',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBodyPartsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  editBodyPartsText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  helperText: {
    textAlign: 'center',
    color: AppColors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primaryText,
  },
  // Body Parts Picker Styles
  bodyPartsModal: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  bodyPartsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  bodyPartsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primaryText,
  },
  bodyRegionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  bodyPartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  bodyPartChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  bodyPartChipSelected: {
    backgroundColor: AppColors.body + '20',
    borderColor: AppColors.body,
  },
  bodyPartChipText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  bodyPartChipTextSelected: {
    color: AppColors.body,
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 12,
  },
  clearAllText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
});
