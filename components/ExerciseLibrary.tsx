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
  Alert,
  Modal,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ExerciseLibraryItem, RoutineCategory, RoutineDifficulty } from '../types'
import { getExercises, deleteExercise } from '../lib/utils/exercises'
import { AppColors } from '../constants/theme'

interface ExerciseLibraryProps {
  onSelectExercise?: (exercise: ExerciseLibraryItem) => void
  onEditExercise?: (exercise: ExerciseLibraryItem) => void
  onDeleteExercise?: (exerciseId: string) => void
  category?: RoutineCategory
  showOfficialOnly?: boolean
  allowSelection?: boolean
  allowEditing?: boolean
  allowDeleting?: boolean
  /** Current user ID - needed to determine edit/delete permissions */
  userId?: string
  /** Whether current user is health_team or admin */
  isHealthTeam?: boolean
}

export default function ExerciseLibrary({
  onSelectExercise,
  onEditExercise,
  onDeleteExercise,
  category,
  showOfficialOnly = false,
  allowSelection = true,
  allowEditing = false,
  allowDeleting = false,
  userId,
  isHealthTeam = false,
}: ExerciseLibraryProps) {

  /**
   * Check if user can edit/delete a specific exercise
   * - Health team/admin can edit any exercise
   * - Regular users can only edit exercises they created (not official ones)
   */
  const canModifyExercise = (exercise: ExerciseLibraryItem): boolean => {
    if (isHealthTeam) {
      return true // Health team can edit anything
    }
    // Regular users can only edit their own non-official exercises
    return !exercise.is_official && exercise.created_by === userId
  }

  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([])
  const [filteredExercises, setFilteredExercises] = useState<ExerciseLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<RoutineCategory | undefined>(category)
  const [selectedDifficulty, setSelectedDifficulty] = useState<RoutineDifficulty | undefined>()
  const [selectedOwnership, setSelectedOwnership] = useState<'all' | 'official' | 'mine' | 'community'>('all')

  // Dropdown modal state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false)
  const [difficultyModalVisible, setDifficultyModalVisible] = useState(false)
  const [ownershipModalVisible, setOwnershipModalVisible] = useState(false)

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

    // Ownership filter
    if (selectedOwnership !== 'all') {
      filtered = filtered.filter((ex) => {
        switch (selectedOwnership) {
          case 'official':
            return ex.is_official === true
          case 'mine':
            return ex.created_by === userId
          case 'community':
            // Community = all non-official exercises (including user's own)
            return !ex.is_official
          default:
            return true
        }
      })
    }

    setFilteredExercises(filtered)
  }, [exercises, searchQuery, selectedDifficulty, selectedOwnership, userId])

  const loadExercises = async () => {
    setLoading(true)
    const { exercises: data } = await getExercises({
      category: selectedCategory,
      isOfficial: showOfficialOnly ? true : undefined,
    })
    setExercises(data)
    setLoading(false)
  }

  const handleDeleteExercise = (exercise: ExerciseLibraryItem) => {
    Alert.alert(
      'Delete Exercise?',
      `Are you sure you want to delete "${exercise.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await deleteExercise(exercise.id)

            if (error || !success) {
              Alert.alert('Error', error?.message || 'Failed to delete exercise. Check permissions.')
              return
            }

            // Reload exercises to reflect deletion
            await loadExercises()

            // Call parent callback if provided
            if (onDeleteExercise) {
              onDeleteExercise(exercise.id)
            }

            Alert.alert('Success', 'Exercise deleted successfully')
          },
        },
      ]
    )
  }

  const categories: (RoutineCategory | undefined)[] = [undefined, 'Body', 'Mind', 'Soul']
  const difficulties: (RoutineDifficulty | undefined)[] = [
    undefined,
    'Beginner',
    'Intermediate',
    'Advanced',
  ]

  const renderExerciseCard = ({ item }: { item: ExerciseLibraryItem }) => {
    const canModify = canModifyExercise(item)
    const showEditButton = allowEditing && canModify && onEditExercise
    const showDeleteButton = allowDeleting && canModify

    return (
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
          {(showEditButton || showDeleteButton) && (
            <View style={styles.actionButtons}>
              {showEditButton && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEditExercise(item)}
                >
                  <Ionicons name="create-outline" size={24} color={AppColors.primary} />
                </TouchableOpacity>
              )}
              {showDeleteButton && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteExercise(item)}
                >
                  <Ionicons name="trash-outline" size={24} color={AppColors.destructive} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.exerciseMeta}>
          {/* Author indicator - first */}
          {item.is_official ? (
            <View style={styles.officialBadge}>
              <Ionicons name="checkmark-circle" size={12} color={AppColors.success} />
              <Text style={styles.officialText}>Official</Text>
            </View>
          ) : item.created_by ? (
            <View style={styles.communityBadge}>
              <Text style={styles.communityText}>
                {item.created_by === userId ? 'You' : 'Community'}
              </Text>
            </View>
          ) : null}
          {/* Category - second */}
          <View style={[styles.categoryBadge, getCategoryStyle(item.category)]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          {/* Duration - third */}
          <View style={styles.durationContainer}>
            <Ionicons name="time-outline" size={14} color={AppColors.textSecondary} />
            <Text style={styles.durationText}>
              {Math.floor(item.default_duration_seconds / 60)}:
              {String(item.default_duration_seconds % 60).padStart(2, '0')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const getCategoryStyle = (cat: RoutineCategory) => {
    switch (cat) {
      case 'Mind':
        return { backgroundColor: AppColors.mind + '20' }
      case 'Body':
        return { backgroundColor: AppColors.body + '20' }
      case 'Soul':
        return { backgroundColor: AppColors.soul + '20' }
      default:
        return { backgroundColor: AppColors.primary + '20' }
    }
  }

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
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Dropdowns */}
      <View style={styles.filtersRow}>
        {/* Created By Dropdown */}
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setOwnershipModalVisible(true)}
        >
          <Text style={styles.dropdownLabel}>Created By</Text>
          <View style={styles.dropdownValue}>
            <Text style={styles.dropdownValueText}>
              {selectedOwnership === 'all' ? 'All' :
               selectedOwnership === 'official' ? 'Official' :
               selectedOwnership === 'mine' ? 'My Exercises' : 'Community'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={AppColors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Category Dropdown */}
        {!category && (
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text style={styles.dropdownLabel}>Category</Text>
            <View style={styles.dropdownValue}>
              <Text style={styles.dropdownValueText}>
                {selectedCategory || 'All'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={AppColors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Difficulty Dropdown */}
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDifficultyModalVisible(true)}
        >
          <Text style={styles.dropdownLabel}>Difficulty</Text>
          <View style={styles.dropdownValue}>
            <Text style={styles.dropdownValueText}>
              {selectedDifficulty || 'All'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={AppColors.textSecondary} />
          </View>
        </TouchableOpacity>
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

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat || 'all'}
                  style={[
                    styles.modalOption,
                    selectedCategory === cat && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat)
                    setCategoryModalVisible(false)
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedCategory === cat && styles.modalOptionTextActive,
                    ]}
                  >
                    {cat || 'All Categories'}
                  </Text>
                  {selectedCategory === cat && (
                    <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Difficulty Modal */}
      <Modal
        visible={difficultyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDifficultyModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDifficultyModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Difficulty</Text>
            <ScrollView>
              {difficulties.map((diff) => (
                <TouchableOpacity
                  key={diff || 'all'}
                  style={[
                    styles.modalOption,
                    selectedDifficulty === diff && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedDifficulty(diff)
                    setDifficultyModalVisible(false)
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedDifficulty === diff && styles.modalOptionTextActive,
                    ]}
                  >
                    {diff || 'All Difficulties'}
                  </Text>
                  {selectedDifficulty === diff && (
                    <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Ownership Modal */}
      <Modal
        visible={ownershipModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOwnershipModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOwnershipModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Created By</Text>
            <ScrollView>
              {([
                { value: 'all', label: 'All Exercises' },
                { value: 'official', label: 'Official' },
                { value: 'mine', label: 'My Exercises' },
                { value: 'community', label: 'Community' },
              ] as const).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    selectedOwnership === option.value && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedOwnership(option.value)
                    setOwnershipModalVisible(false)
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedOwnership === option.value && styles.modalOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedOwnership === option.value && (
                    <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dropdown: {
    minWidth: 100,
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: 10,
  },
  dropdownLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  dropdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textPrimary,
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
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
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
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  officialText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.success,
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.textSecondary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  communityText: {
    fontSize: 11,
    fontWeight: '500',
    color: AppColors.textSecondary,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    maxHeight: '50%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalOptionActive: {
    backgroundColor: AppColors.primary + '15',
  },
  modalOptionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  modalOptionTextActive: {
    color: AppColors.primary,
    fontWeight: '600',
  },
})
