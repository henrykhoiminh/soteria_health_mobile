import React, { useState } from 'react';
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
import { JourneyFocus } from '@/types';
import { updateUserProfile } from '@/lib/utils/auth';

interface JourneyFocusModalProps {
  visible: boolean;
  currentFocus: JourneyFocus;
  currentRecoveryAreas?: string[];
  currentRecoveryGoals?: string[];
  journeyStartedAt?: string;
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const JOURNEY_OPTIONS: JourneyFocus[] = ['Injury Prevention', 'Recovery'];

export default function JourneyFocusModal({
  visible,
  currentFocus,
  currentRecoveryAreas = [],
  currentRecoveryGoals = [],
  journeyStartedAt,
  userId,
  onClose,
  onUpdate,
}: JourneyFocusModalProps) {
  const [selectedFocus, setSelectedFocus] = useState<JourneyFocus>(currentFocus);
  const [saving, setSaving] = useState(false);

  const getDayCount = () => {
    if (!journeyStartedAt) return 0;
    const started = new Date(journeyStartedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - started.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSave = async () => {
    if (selectedFocus === currentFocus) {
      // No changes, just close
      onClose();
      return;
    }

    try {
      setSaving(true);

      // Update the journey focus
      await updateUserProfile(userId, {
        journey_focus: selectedFocus,
        // Reset recovery-specific fields if switching to Prevention
        ...(selectedFocus === 'Injury Prevention' && {
          recovery_areas: [],
          recovery_goals: [],
        }),
      });

      Alert.alert(
        'Journey Updated',
        `Your journey focus has been changed to ${selectedFocus}. Keep up the great work!`,
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
      Alert.alert('Error', 'Failed to update journey focus. Please try again.');
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
              {currentFocus === 'Recovery' && currentRecoveryAreas.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Recovery Areas:</Text>
                  <Text style={styles.infoText}>{currentRecoveryAreas.join(', ')}</Text>
                </View>
              )}
              {currentFocus === 'Recovery' && currentRecoveryGoals.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Goals:</Text>
                  <Text style={styles.infoText}>{currentRecoveryGoals.join(', ')}</Text>
                </View>
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

            {/* Warning if changing */}
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
                <ActivityIndicator color={AppColors.textPrimary} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {selectedFocus === currentFocus ? 'Close' : 'Save Changes'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    marginBottom: 8,
  },
  infoSection: {
    marginTop: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: AppColors.textPrimary,
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
    color: AppColors.textPrimary,
  },
});
