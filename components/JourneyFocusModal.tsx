import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { JourneyFocus, UPPER_BODY_AREAS, LOWER_BODY_AREAS } from '@/types';
import { updateUserProfile } from '@/lib/utils/auth';

interface JourneyFocusModalProps {
  visible: boolean;
  currentFocus: JourneyFocus;
  currentRecoveryAreas?: string[] | null;
  journeyStartedAt?: string;
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const JOURNEY_OPTIONS: JourneyFocus[] = ['Injury Prevention', 'Recovery'];

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

export default function JourneyFocusModal({
  visible,
  currentFocus,
  currentRecoveryAreas,
  journeyStartedAt,
  userId,
  onClose,
  onUpdate,
}: JourneyFocusModalProps) {
  const [selectedFocus, setSelectedFocus] = useState<JourneyFocus>(currentFocus);
  const [recoveryAreas, setRecoveryAreas] = useState<string[]>(currentRecoveryAreas || []);
  const [showBodyPartsPicker, setShowBodyPartsPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedFocus(currentFocus);
      setRecoveryAreas(currentRecoveryAreas || []);
    }
  }, [visible, currentFocus, currentRecoveryAreas]);

  const getDayCount = () => {
    if (!journeyStartedAt) return 0;
    const started = new Date(journeyStartedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - started.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if a recovery category is selected
  const isCategorySelected = (categoryId: string): boolean => {
    if (categoryId === 'Mind' || categoryId === 'Soul') {
      return recoveryAreas.includes(categoryId);
    }
    // Body is selected if any body part is in recoveryAreas
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
    return recoveryAreas.some(area => bodyParts.includes(area as typeof bodyParts[number]));
  };

  // Get selected body parts
  const getSelectedBodyParts = (): string[] => {
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
    return recoveryAreas.filter(area => bodyParts.includes(area as typeof bodyParts[number]));
  };

  // Toggle a recovery category
  const toggleCategory = (categoryId: string) => {
    if (categoryId === 'Mind' || categoryId === 'Soul') {
      setRecoveryAreas(prev =>
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
    setRecoveryAreas(prev =>
      prev.includes(part)
        ? prev.filter(a => a !== part)
        : [...prev, part]
    );
  };

  // Clear all body parts
  const clearBodyParts = () => {
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
    setRecoveryAreas(prev => prev.filter(a => !bodyParts.includes(a as typeof bodyParts[number])));
  };

  const handleSave = async () => {
    // Validate recovery areas if Recovery is selected
    if (selectedFocus === 'Recovery' && recoveryAreas.length === 0) {
      Alert.alert(
        'Select Recovery Areas',
        'Please select at least one area you\'re focusing on recovering (Mind, Body parts, or Soul).'
      );
      return;
    }

    const focusChanged = selectedFocus !== currentFocus;
    const areasChanged = JSON.stringify(recoveryAreas.sort()) !== JSON.stringify((currentRecoveryAreas || []).sort());

    if (!focusChanged && !areasChanged) {
      // No changes, just close
      onClose();
      return;
    }

    try {
      setSaving(true);

      // Build update object
      const updates: { journey_focus?: JourneyFocus; recovery_areas?: string[] } = {};

      if (focusChanged) {
        updates.journey_focus = selectedFocus;
      }

      // Always update recovery_areas when Recovery is selected
      if (selectedFocus === 'Recovery') {
        updates.recovery_areas = recoveryAreas;
      } else if (focusChanged && selectedFocus === 'Injury Prevention') {
        // Clear recovery areas when switching to Injury Prevention
        updates.recovery_areas = [];
      }

      await updateUserProfile(userId, updates);

      const message = focusChanged
        ? `Your journey focus has been changed to ${selectedFocus}.${selectedFocus === 'Recovery' ? ' Recovery areas updated.' : ''}`
        : 'Your recovery areas have been updated.';

      Alert.alert(
        focusChanged ? 'Journey Updated' : 'Recovery Areas Updated',
        message,
        [
          {
            text: 'OK',
            onPress: () => {
              onUpdate();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error updating journey focus:', error);
      Alert.alert('Error', 'Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getJourneyIcon = (focus: JourneyFocus) => {
    return focus === 'Recovery' ? 'heart' : 'shield-checkmark';
  };

  const getJourneyColor = (focus: JourneyFocus) => {
    return focus === 'Recovery' ? AppColors.body : AppColors.mind;
  };

  const getJourneyDescription = (focus: JourneyFocus) => {
    return focus === 'Recovery'
      ? 'Heal and recover from injuries with targeted routines'
      : 'Stay healthy and prevent injuries with proactive wellness';
  };

  const selectedBodyParts = getSelectedBodyParts();
  const showRecoveryAreas = selectedFocus === 'Recovery';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Your Journey</Text>
              <Text style={styles.subtitle}>
                {getDayCount()} day{getDayCount() !== 1 ? 's' : ''} on your path
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Current Journey Info */}
            <View style={styles.currentJourneyCard}>
              <View style={styles.currentJourneyHeader}>
                <Ionicons
                  name={getJourneyIcon(currentFocus)}
                  size={32}
                  color={getJourneyColor(currentFocus)}
                />
                <Text style={styles.currentJourneyTitle}>Current Focus</Text>
              </View>
              <Text style={styles.currentJourneyName}>{currentFocus}</Text>
              {currentFocus === 'Recovery' && currentRecoveryAreas && currentRecoveryAreas.length > 0 && (
                <Text style={styles.currentRecoveryAreas}>
                  Areas: {currentRecoveryAreas.join(', ')}
                </Text>
              )}
            </View>

            {/* Change Journey Section */}
            <Text style={styles.sectionTitle}>Change Journey Focus</Text>
            <Text style={styles.sectionDescription}>
              Switch to a different focus for your wellness journey
            </Text>

            {JOURNEY_OPTIONS.filter(option => option !== currentFocus).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionCard,
                  selectedFocus === option && styles.optionCardSelected,
                  {
                    borderColor:
                      selectedFocus === option
                        ? getJourneyColor(option)
                        : AppColors.border,
                  },
                ]}
                onPress={() => setSelectedFocus(option)}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: getJourneyColor(option) + '15' },
                    ]}
                  >
                    <Ionicons
                      name={getJourneyIcon(option)}
                      size={28}
                      color={getJourneyColor(option)}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>{option}</Text>
                    <Text style={styles.optionDescription}>
                      {getJourneyDescription(option)}
                    </Text>
                  </View>
                  {selectedFocus === option && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={getJourneyColor(option)}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Recovery Areas Section */}
            {showRecoveryAreas && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recovery Areas</Text>
                <Text style={styles.sectionDescription}>
                  Select the areas you're focusing on recovering
                </Text>

                {RECOVERY_CATEGORIES.map((category) => {
                  const isSelected = isCategorySelected(category.id);
                  const isBody = category.id === 'Body';

                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.recoveryCard,
                        isSelected && { borderColor: category.color },
                      ]}
                      onPress={() => toggleCategory(category.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.recoveryCardContent}>
                        <View
                          style={[
                            styles.recoveryIconContainer,
                            { backgroundColor: category.color + '15' },
                          ]}
                        >
                          <Ionicons
                            name={category.icon}
                            size={24}
                            color={category.color}
                          />
                        </View>
                        <View style={styles.recoveryTextContainer}>
                          <Text style={styles.recoveryLabel}>{category.label}</Text>
                          <Text style={styles.recoveryDescription}>
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
                            <Ionicons name="checkmark" size={16} color="#fff" />
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

                {recoveryAreas.length === 0 && (
                  <View style={styles.warningCard}>
                    <Ionicons name="alert-circle" size={20} color={AppColors.soul} />
                    <Text style={styles.warningText}>
                      Please select at least one recovery area to continue.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Warning if changing journey focus */}
            {selectedFocus !== currentFocus && (
              <View style={styles.warningCard}>
                <Ionicons name="information-circle" size={20} color={AppColors.soul} />
                <Text style={styles.warningText}>
                  Changing your journey focus will adjust your recommended routines and
                  tracking.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                saving && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={AppColors.primaryText} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {selectedFocus === currentFocus &&
                   JSON.stringify(recoveryAreas.sort()) === JSON.stringify((currentRecoveryAreas || []).sort())
                    ? 'Close'
                    : 'Save Changes'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
                  const isSelected = recoveryAreas.includes(part);
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
                  const isSelected = recoveryAreas.includes(part);
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
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  currentJourneyCard: {
    margin: 20,
    padding: 20,
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  currentJourneyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  currentJourneyTitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentJourneyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  currentRecoveryAreas: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  optionCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionCardSelected: {
    backgroundColor: AppColors.surfaceSecondary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  // Recovery Area Styles
  recoveryCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.border,
  },
  recoveryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recoveryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recoveryTextContainer: {
    flex: 1,
  },
  recoveryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  recoveryDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  selectedBodyParts: {
    fontSize: 12,
    color: AppColors.body,
    marginTop: 4,
    fontStyle: 'italic',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 20,
    padding: 16,
    backgroundColor: AppColors.soul + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.soul + '30',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: AppColors.textPrimary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  saveButton: {
    backgroundColor: AppColors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
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
