import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import HapticPressable from '@/components/HapticPressable';
import { Ionicons } from '@expo/vector-icons';
import { Routine, RoutineCategory } from '@/types';
import { AppColors } from '@/constants/theme';

interface RecommendedRoutineModalProps {
  visible: boolean;
  routine: Routine | null;
  category: RoutineCategory;
  // Optional wellness-aware messaging
  message?: string;
  subtitle?: string;
  onClose: () => void;
  onBrowseMore: () => void;
  onSelectRoutine: () => void;
}

export default function RecommendedRoutineModal({
  visible,
  routine,
  category,
  message,
  subtitle,
  onClose,
  onBrowseMore,
  onSelectRoutine,
}: RecommendedRoutineModalProps) {
  if (!routine) return null;

  const getCategoryColor = () => {
    switch (category) {
      case 'Mind':
        return '#3B82F6';
      case 'Body':
        return '#EF4444';
      case 'Soul':
        return '#F59E0B';
    }
  };

  const categoryColor = getCategoryColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Recommended Routine</Text>
            <HapticPressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={AppColors.textPrimary} />
            </HapticPressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Wellness-aware message */}
            {message && (
              <View style={styles.wellnessMessageContainer}>
                <Text style={styles.wellnessMessage}>{message}</Text>
                {subtitle && <Text style={styles.wellnessSubtitle}>{subtitle}</Text>}
              </View>
            )}

            {/* Routine Card */}
            <View style={[styles.routineCard, { borderLeftColor: categoryColor }]}>
              {/* Category Badge */}
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>

              {/* Routine Name */}
              <Text style={styles.routineName}>{routine.name}</Text>

              {/* Description */}
              <Text style={styles.description}>{routine.description}</Text>

              {/* Meta Info */}
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={AppColors.textSecondary} />
                  <Text style={styles.metaText}>{routine.duration_minutes} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="barbell-outline" size={16} color={AppColors.textSecondary} />
                  <Text style={styles.metaText}>{routine.difficulty}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={AppColors.textSecondary} />
                  <Text style={styles.metaText}>{routine.completion_count} completions</Text>
                </View>
              </View>

              {/* Benefits */}
              {routine.benefits && routine.benefits.length > 0 && (
                <View style={styles.benefitsContainer}>
                  <Text style={styles.benefitsTitle}>Benefits:</Text>
                  {routine.benefits.slice(0, 3).map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <Ionicons name="checkmark" size={16} color={categoryColor} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Start This Routine Button */}
              <HapticPressable
                style={[styles.startButton, { backgroundColor: categoryColor }]}
                onPress={onSelectRoutine}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Start This Routine</Text>
                <Ionicons name="play" size={20} color="#fff" />
              </HapticPressable>
            </View>
          </ScrollView>

          {/* Browse More Button */}
          <HapticPressable
            style={styles.browseButton}
            onPress={onBrowseMore}
            activeOpacity={0.7}
          >
            <Text style={styles.browseButtonText}>
              Browse other {category} routines
            </Text>
            <Ionicons name="arrow-forward" size={20} color={categoryColor} />
          </HapticPressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: AppColors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  wellnessMessageContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  wellnessMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  wellnessSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  routineCard: {
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  routineName: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  benefitsContainer: {
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    flex: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
});
