/**
 * Exercise Library Component
 *
 * Browse and search exercises from the library
 * Used in routine builder and exercise management
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ExerciseLibraryItem, RoutineCategory, RoutineDifficulty } from '../types'
import { getExercises } from '../lib/utils/exercises'
import { AppColors } from '../constants/theme'

interface ExerciseLibraryProps {
  onSelectExercise?: (exercise: ExerciseLibraryItem) => void
  onEditExercise?: (exercise: ExerciseLibraryItem) => void
  category?: RoutineCategory
  showOfficialOnly?: boolean
  allowSelection?: boolean
  allowEditing?: boolean
}

export default function ExerciseLibrary({
  onSelectExercise,
  onEditExercise,
  category,
  showOfficialOnly = false,
  allowSelection = true,
  allowEditing = false,
}: ExerciseLibraryProps) {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([])
  const [filteredExercises, setFilteredExercises] = useState<ExerciseLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<RoutineCategory | undefined>(category)
  const [selectedDifficulty, setSelectedDifficulty] = useState<RoutineDifficulty | undefined>()

  // Load exercises
  useEffect(() => {
    loadExercises()
  }, [selectedCategory, showOfficialOnly])

  // Filter exercises based on search
  useEffect(() => {
    let filtered = exercises

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.description.toLowerCase().includes(query) ||
          ex.instructions.toLowerCase().includes(query)
      )
    }

    // Difficulty filter
    if (selectedDifficulty) {
      filtered = filtered.filter((ex) => ex.difficulty === selectedDifficulty)
    }

    setFilteredExercises(filtered)
  }, [exercises, searchQuery, selectedDifficulty])

  const loadExercises = async () => {
    setLoading(true)
    const { exercises: data } = await getExercises({
      category: selectedCategory,
      isOfficial: showOfficialOnly ? true : undefined,
    })
    setExercises(data)
    setLoading(false)
  }

  const categories: (RoutineCategory | undefined)[] = [undefined, 'Body', 'Mind', 'Soul']
  const difficulties: (RoutineDifficulty | undefined)[] = [
    undefined,
    'Beginner',
    'Intermediate',
    'Advanced',
  ]

  const renderExerciseCard = ({ item }: { item: ExerciseLibraryItem }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => allowSelection && onSelectExercise?.(item)}
      disabled={!allowSelection}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.exerciseDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        {allowEditing && onEditExercise && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEditExercise(item)}
          >
            <Ionicons name="create-outline" size={24} color={AppColors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.exerciseMeta}>
        <View style={styles.metaRow}>
          <View style={[styles.badge, styles.categoryBadge]}>
            <Text style={styles.badgeText}>{item.category}</Text>
          </View>
          <View style={[styles.badge, styles.difficultyBadge]}>
            <Text style={styles.badgeText}>{item.difficulty}</Text>
          </View>
          <View style={styles.durationContainer}>
            <Ionicons name="time-outline" size={16} color={AppColors.textSecondary} />
            <Text style={styles.durationText}>
              {Math.floor(item.default_duration_seconds / 60)}:
              {String(item.default_duration_seconds % 60).padStart(2, '0')}
            </Text>
          </View>
        </View>

        {item.is_official && (
          <View style={styles.officialBadge}>
            <Ionicons name="checkmark-circle" size={16} color={AppColors.success} />
            <Text style={styles.officialText}>Official</Text>
          </View>
        )}

        {item.body_parts && item.body_parts.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.body_parts.slice(0, 3).map((part, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{part}</Text>
              </View>
            ))}
            {item.body_parts.length > 3 && (
              <Text style={styles.moreText}>+{item.body_parts.length - 3} more</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={AppColors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={AppColors.textSecondary}
        />
      </View>

      {/* Category Filter */}
      {!category && (
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Category:</Text>
          <View style={styles.filterButtons}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat || 'all'}
                style={[
                  styles.filterButton,
                  selectedCategory === cat && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedCategory === cat && styles.filterButtonTextActive,
                  ]}
                >
                  {cat || 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Difficulty Filter */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Difficulty:</Text>
        <View style={styles.filterButtons}>
          {difficulties.map((diff) => (
            <TouchableOpacity
              key={diff || 'all'}
              style={[
                styles.filterButton,
                selectedDifficulty === diff && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedDifficulty(diff)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedDifficulty === diff && styles.filterButtonTextActive,
                ]}
              >
                {diff || 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
      </Text>

      {/* Exercise List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          renderItem={renderExerciseCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={64} color={AppColors.textSecondary} />
              <Text style={styles.emptyText}>No exercises found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  exerciseCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  editButton: {
    padding: 4,
  },
  exerciseMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadge: {
    backgroundColor: AppColors.primary + '20',
  },
  difficultyBadge: {
    backgroundColor: AppColors.textSecondary + '20',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  officialText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.success,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: AppColors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: AppColors.textSecondary,
  },
  moreText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
})
