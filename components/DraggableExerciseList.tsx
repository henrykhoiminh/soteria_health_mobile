import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { RoutineBuilderExercise } from '@/types';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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

      {reorderMode ? (
        // Horizontal scroll view for reorder mode
        <View style={styles.reorderContainer}>
          <Text style={styles.reorderHint}>Tap arrows to reorder</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {exercises.map((exercise, index) => (
              <ReorderCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                totalCount={exercises.length}
                onMoveUp={() => handleMove(index, 'up')}
                onMoveDown={() => handleMove(index, 'down')}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        // Vertical list for default mode
        exercises.map((exercise, index) => (
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
        ))
      )}
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
  const translateX = new Animated.Value(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const panGesture = Gesture.Pan()
    .enabled(isEditMode && !reorderMode)
    .onUpdate((event) => {
      // Only allow left swipe (negative translation)
      if (event.translationX < 0) {
        translateX.setValue(Math.max(event.translationX, -80));
      }
    })
    .onEnd((event) => {
      if (event.translationX < -40) {
        // Reveal delete button
        Animated.spring(translateX, {
          toValue: -80,
          useNativeDriver: true,
        }).start();
        setIsRevealed(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        setIsRevealed(false);
      }
    });

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemove(exercise.id);
  };

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    setIsRevealed(false);
  };

  // Close swipe when entering reorder mode
  React.useEffect(() => {
    if (reorderMode && isRevealed) {
      closeSwipe();
    }
  }, [reorderMode]);

  return (
    <View style={styles.exerciseCardContainer}>
      {/* Delete button (revealed on swipe) */}
      <View style={styles.deleteBackground}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main card content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.exerciseCard,
            { transform: [{ translateX }] },
          ]}
        >
          <View style={styles.exerciseContent}>
            <Text style={styles.exerciseNumber}>{index + 1}</Text>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDuration}>
                {exercise.duration_seconds}s
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

            {/* Default mode: Show edit time button */}
            {!reorderMode && isEditMode && (
              <TouchableOpacity
                onPress={() => onEdit(exercise)}
                style={styles.editTimeButton}
              >
                <Ionicons name="time-outline" size={28} color={AppColors.primary} />
              </TouchableOpacity>
            )}

            {/* Non-edit mode: Show remove button */}
            {!isEditMode && (
              <TouchableOpacity onPress={() => onRemove(exercise.id)}>
                <Ionicons name="close-circle" size={24} color={AppColors.destructive} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

interface ReorderCardProps {
  exercise: RoutineBuilderExercise;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ReorderCard({
  exercise,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
}: ReorderCardProps) {
  return (
    <View style={styles.reorderCard}>
      {/* Exercise Number Badge */}
      <View style={styles.reorderCardHeader}>
        <View style={styles.reorderNumberBadge}>
          <Text style={styles.reorderNumber}>{index + 1}</Text>
        </View>
      </View>

      {/* Exercise Info */}
      <View style={styles.reorderCardContent}>
        <Text style={styles.reorderCardName} numberOfLines={2}>
          {exercise.name}
        </Text>
        <Text style={styles.reorderCardDuration}>
          {exercise.duration_seconds}s
        </Text>
      </View>

      {/* Reorder Controls */}
      <View style={styles.reorderCardControls}>
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={index === 0}
          style={[
            styles.reorderCardButton,
            index === 0 && styles.reorderCardButtonDisabled,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={index === 0 ? AppColors.border : AppColors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMoveDown}
          disabled={index === totalCount - 1}
          style={[
            styles.reorderCardButton,
            index === totalCount - 1 && styles.reorderCardButtonDisabled,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={index === totalCount - 1 ? AppColors.border : AppColors.primary}
          />
        </TouchableOpacity>
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
    color: '#FFFFFF',
  },
  exerciseCardContainer: {
    position: 'relative',
    minHeight: 70,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: AppColors.destructive,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  reorderContainer: {
    marginTop: 8,
  },
  reorderHint: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  horizontalList: {
    paddingHorizontal: 4,
    gap: 12,
    flexDirection: 'row',
  },
  reorderCard: {
    width: 140,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.primary,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  reorderCardHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  reorderNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  reorderCardContent: {
    alignItems: 'center',
    minHeight: 60,
    marginBottom: 12,
  },
  reorderCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 18,
  },
  reorderCardDuration: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  reorderCardControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  reorderCardButton: {
    flex: 1,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderCardButtonDisabled: {
    opacity: 0.3,
  },
});
