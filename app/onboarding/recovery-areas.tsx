import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { AppColors } from '@/constants/theme';
import { UPPER_BODY_AREAS, LOWER_BODY_AREAS } from '@/types';
import SoteriaPresence from './components/SoteriaPresence';
import SoteriaDialogueBox from './components/SoteriaDialogueBox';
import OnboardingButton from './components/OnboardingButton';
import OnboardingProgress from './components/OnboardingProgress';

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

// Screen: Recovery Areas Selection (shown only for Recovery journey)
export default function RecoveryAreasScreen() {
  const router = useRouter();
  const { data, setRecoveryAreas } = useOnboarding();
  const [selectedAreas, setSelectedAreas] = useState<string[]>(data.recoveryAreas || []);
  const [showBodyPartsPicker, setShowBodyPartsPicker] = useState(false);

  // Check if a recovery category is selected
  const isCategorySelected = (categoryId: string): boolean => {
    if (categoryId === 'Mind' || categoryId === 'Soul') {
      return selectedAreas.includes(categoryId);
    }
    // Body is selected if any body part is in selectedAreas
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
    return selectedAreas.some(area => bodyParts.includes(area as typeof bodyParts[number]));
  };

  // Get selected body parts
  const getSelectedBodyParts = (): string[] => {
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
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
      // Open body parts picker
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
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
    setSelectedAreas(prev => prev.filter(a => !bodyParts.includes(a as typeof bodyParts[number])));
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecoveryAreas(selectedAreas);
    router.push('/onboarding/three-lights');
  };

  const selectedBodyParts = getSelectedBodyParts();
  const canContinue = selectedAreas.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress currentStep="recovery-areas" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Soteria's presence */}
        <View style={styles.presenceContainer}>
          <SoteriaPresence size="small" intensity="low" />
        </View>

        {/* Dialogue */}
        <View style={styles.dialogueContainer}>
          <SoteriaDialogueBox
            text="Where does your journey of healing need to begin?"
            glowPosition="top"
          />
        </View>

        {/* Recovery Categories */}
        <View style={styles.categoriesContainer}>
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
        </View>

        {/* Helper text */}
        {selectedAreas.length === 0 && (
          <Text style={styles.helperText}>
            Select at least one area to continue
          </Text>
        )}
      </ScrollView>

      {/* Continue button */}
      <OnboardingButton
        label="Continue"
        onPress={handleContinue}
        visible={canContinue}
      />

      {/* Body Parts Picker Modal */}
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
                {UPPER_BODY_AREAS.map((part) => {
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
                {LOWER_BODY_AREAS.map((part) => {
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  presenceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  dialogueContainer: {
    marginBottom: 32,
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryCard: {
    padding: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColors.border,
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
    marginTop: 24,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
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
