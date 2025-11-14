import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Routine, RoutineCategory } from '@/types';
import { AppColors } from '@/constants/theme';

interface CompletedRoutinesModalProps {
  visible: boolean;
  routines: Routine[];
  onClose: () => void;
  onSelectRoutine: (routineId: string) => void;
}

export default function CompletedRoutinesModal({
  visible,
  routines,
  onClose,
  onSelectRoutine,
}: CompletedRoutinesModalProps) {
  const getCategoryColor = (category: RoutineCategory) => {
    switch (category) {
      case 'Mind':
        return '#3B82F6';
      case 'Body':
        return '#EF4444';
      case 'Soul':
        return '#F59E0B';
    }
  };

  const getCategoryIcon = (category: RoutineCategory) => {
    switch (category) {
      case 'Mind':
        return 'fitness' as const;
      case 'Body':
        return 'body' as const;
      case 'Soul':
        return 'heart' as const;
    }
  };

  // Group routines by category
  const groupedRoutines = {
    Mind: routines.filter(r => r.category === 'Mind'),
    Body: routines.filter(r => r.category === 'Body'),
    Soul: routines.filter(r => r.category === 'Soul'),
  };

  const renderRoutineCard = (routine: Routine) => {
    const categoryColor = getCategoryColor(routine.category);

    return (
      <TouchableOpacity
        key={routine.id}
        style={[styles.routineCard, { borderLeftColor: categoryColor }]}
        onPress={() => {
          onClose();
          onSelectRoutine(routine.id);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.routineHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
            <Ionicons name={getCategoryIcon(routine.category)} size={14} color="#fff" />
            <Text style={styles.categoryText}>{routine.category}</Text>
          </View>
          <View style={styles.completionBadge}>
            <Ionicons name="checkmark-circle" size={14} color={AppColors.success} />
            <Text style={styles.completionText}>{routine.completion_count}</Text>
          </View>
        </View>

        <Text style={styles.routineName}>{routine.name}</Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={AppColors.textSecondary} />
            <Text style={styles.metaText}>{routine.duration_minutes} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={14} color={AppColors.textSecondary} />
            <Text style={styles.metaText}>{routine.difficulty}</Text>
          </View>
        </View>

        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View</Text>
          <Ionicons name="arrow-forward" size={16} color={categoryColor} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategorySection = (category: RoutineCategory) => {
    const categoryRoutines = groupedRoutines[category];
    if (categoryRoutines.length === 0) return null;

    const categoryColor = getCategoryColor(category);

    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categorySectionHeader}>
          <Ionicons name={getCategoryIcon(category)} size={20} color={categoryColor} />
          <Text style={[styles.categorySectionTitle, { color: categoryColor }]}>
            {category}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: categoryColor + '20' }]}>
            <Text style={[styles.countBadgeText, { color: categoryColor }]}>
              {categoryRoutines.length}
            </Text>
          </View>
        </View>
        {categoryRoutines.map(routine => renderRoutineCard(routine))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Completed Routines</Text>
              <Text style={styles.subtitle}>
                {routines.length} unique routine{routines.length !== 1 ? 's' : ''} completed
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={AppColors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {routines.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color={AppColors.textTertiary} />
                <Text style={styles.emptyStateTitle}>No Routines Yet</Text>
                <Text style={styles.emptyStateText}>
                  Complete your first routine to see it here!
                </Text>
              </View>
            ) : (
              <>
                {renderCategorySection('Mind')}
                {renderCategorySection('Body')}
                {renderCategorySection('Soul')}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  routineCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completionText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  routineName: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
});
