import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { RoutineBuilderExercise } from '@/types';
import { formatDuration } from '@/lib/utils/time';
import * as Haptics from 'expo-haptics';

interface DraggableExerciseListProps {
  exercises: RoutineBuilderExercise[];
  onReorder: (exercises: RoutineBuilderExercise[]) => void;
  onEdit: (exercise: RoutineBuilderExercise) => void;
  onRemove: (id: string) => void;
  isEditMode?: boolean;
}

export default function DraggableExerciseList({
  exercises,
  onReorder,
  onEdit,
  onRemove,
  isEditMode = false,
}: DraggableExerciseListProps) {
  const [reorderMode, setReorderMode] = useState(false);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= exercises.length) return;

    const newExercises = [...exercises];
    [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];

    onReorder(newExercises);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      {isEditMode && exercises.length > 1 && (
        <TouchableOpacity
          style={[styles.reorderModeButton, reorderMode && styles.reorderModeButtonActive]}
          onPress={() => {
            setReorderMode(!reorderMode);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Ionicons
            name={reorderMode ? 'checkmark-circle' : 'swap-vertical'}
            size={20}
            color={reorderMode ? '#FFFFFF' : AppColors.primary}
          />
          <Text style={[styles.reorderModeButtonText, reorderMode && styles.reorderModeButtonTextActive]}>
            {reorderMode ? 'Done Reordering' : 'Reorder Exercises'}
          </Text>
        </TouchableOpacity>
      )}

      {exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          totalCount={exercises.length}
          onMoveUp={() => handleMove(index, 'up')}
          onMoveDown={() => handleMove(index, 'down')}
          onEdit={onEdit}
          onRemove={onRemove}
          isEditMode={isEditMode}
          reorderMode={reorderMode}
        />
      ))}
    </View>
  );
}

interface ExerciseCardProps {
  exercise: RoutineBuilderExercise;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: (exercise: RoutineBuilderExercise) => void;
  onRemove: (id: string) => void;
  isEditMode: boolean;
  reorderMode: boolean;
}

function ExerciseCard({
  exercise,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onEdit,
  onRemove,
  isEditMode,
  reorderMode,
}: ExerciseCardProps) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseContent}>
        <Text style={styles.exerciseNumber}>{index + 1}</Text>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseDuration}>
            {formatDuration(exercise.duration_seconds)}
          </Text>
        </View>

        {/* Reorder mode: Show up/down arrows */}
        {reorderMode && (
          <View style={styles.reorderButtons}>
            <TouchableOpacity
              onPress={onMoveUp}
              disabled={index === 0}
              style={styles.reorderButtonLarge}
            >
              <Ionicons
                name="chevron-up"
                size={28}
                color={index === 0 ? AppColors.border : AppColors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMoveDown}
              disabled={index === totalCount - 1}
              style={styles.reorderButtonLarge}
            >
              <Ionicons
                name="chevron-down"
                size={28}
                color={index === totalCount - 1 ? AppColors.border : AppColors.primary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Default mode: Show edit time and delete buttons */}
        {!reorderMode && isEditMode && (
          <>
            <TouchableOpacity
              onPress={() => onEdit(exercise)}
              style={styles.editTimeButton}
            >
              <Ionicons name="time-outline" size={28} color={AppColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onRemove(exercise.id)}
              style={styles.deleteIconButton}
            >
              <Ionicons name="trash-outline" size={24} color={AppColors.destructive} />
            </TouchableOpacity>
          </>
        )}

        {/* Non-edit mode: Show remove button */}
        {!isEditMode && (
          <TouchableOpacity onPress={() => onRemove(exercise.id)}>
            <Ionicons name="close-circle" size={24} color={AppColors.destructive} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 16,
  },
  reorderModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: AppColors.surface,
    borderWidth: 2,
    borderColor: AppColors.primary,
    marginBottom: 12,
  },
  reorderModeButtonActive: {
    backgroundColor: AppColors.primary,
  },
  reorderModeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.primary,
  },
  reorderModeButtonTextActive: {
    color: AppColors.primaryText,
  },
  exerciseCard: {
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
    minHeight: 70,
    marginBottom: 8,
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  exerciseNumber: {
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
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  exerciseDuration: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reorderButtonLarge: {
    padding: 6,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 8,
  },
  editTimeButton: {
    padding: 8,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 8,
  },
  deleteIconButton: {
    padding: 8,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 8,
  },
});
