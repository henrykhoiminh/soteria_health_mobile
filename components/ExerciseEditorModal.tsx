/**
 * Exercise Editor Modal
 *
 * Modal for creating or editing exercises
 * Used by health team members
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ExerciseLibraryItem, RoutineCategory, RoutineDifficulty, BodyRegion } from '../types'
import { createExercise, updateExercise } from '../lib/utils/exercises'
import { UPPER_BODY_AREAS, LOWER_BODY_AREAS } from '../types'
import { AppColors } from '../constants/theme'

interface ExerciseEditorModalProps {
  visible: boolean
  onClose: () => void
  onSave: () => void
  exercise?: ExerciseLibraryItem | null
  userId: string
  isHealthTeam: boolean
}

export default function ExerciseEditorModal({
  visible,
  onClose,
  onSave,
  exercise,
  userId,
  isHealthTeam,
}: ExerciseEditorModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [category, setCategory] = useState<RoutineCategory>('Body')
  const [difficulty, setDifficulty] = useState<RoutineDifficulty>('Beginner')
  const [durationMinutes, setDurationMinutes] = useState('1')
  const [durationSeconds, setDurationSeconds] = useState('0')
  const [bodyParts, setBodyParts] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isOfficial, setIsOfficial] = useState(false)
  const [requiresEquipment, setRequiresEquipment] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bodyPartsModalVisible, setBodyPartsModalVisible] = useState(false)
  const [bodyRegionFilter, setBodyRegionFilter] = useState<BodyRegion>('All')

  const isEditing = !!exercise

  // Load exercise data when editing
  useEffect(() => {
    if (exercise) {
      setName(exercise.name)
      setDescription(exercise.description)
      setInstructions(exercise.instructions)
      setCategory(exercise.category)
      setDifficulty(exercise.difficulty)
      const mins = Math.floor(exercise.default_duration_seconds / 60)
      const secs = exercise.default_duration_seconds % 60
      setDurationMinutes(String(mins))
      setDurationSeconds(String(secs))
      setBodyParts(exercise.body_parts || [])
      setTags(exercise.tags || [])
      setIsOfficial(exercise.is_official)
      setRequiresEquipment(exercise.requires_equipment)
    } else {
      // Reset for new exercise
      setName('')
      setDescription('')
      setInstructions('')
      setCategory('Body')
      setDifficulty('Beginner')
      setDurationMinutes('1')
      setDurationSeconds('0')
      setBodyParts([])
      setTags([])
      setTagInput('')
      setIsOfficial(isHealthTeam)
      setRequiresEquipment(false)
    }
  }, [exercise, isHealthTeam])

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name')
      return
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description')
      return
    }
    if (!instructions.trim()) {
      Alert.alert('Error', 'Please enter instructions')
      return
    }

    const mins = parseInt(durationMinutes) || 0
    const secs = parseInt(durationSeconds) || 0
    const totalSeconds = mins * 60 + secs

    if (totalSeconds < 5) {
      Alert.alert('Error', 'Duration must be at least 5 seconds')
      return
    }
    if (totalSeconds > 1800) {
      Alert.alert('Error', 'Duration cannot exceed 30 minutes')
      return
    }

    setSaving(true)

    try {
      const exerciseData = {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        category,
        difficulty,
        default_duration_seconds: totalSeconds,
        body_parts: bodyParts.length > 0 ? bodyParts : undefined,
        tags: tags.length > 0 ? tags : undefined,
        is_official: isOfficial,
        is_public: true,
        requires_equipment: requiresEquipment,
      }

      let result
      if (isEditing && exercise) {
        result = await updateExercise({ id: exercise.id, ...exerciseData })
      } else {
        result = await createExercise(exerciseData, userId)
      }

      if (result.error) {
        throw result.error
      }

      Alert.alert(
        'Success',
        `Exercise ${isEditing ? 'updated' : 'created'} successfully!`,
        [{ text: 'OK', onPress: () => { onSave(); onClose() } }]
      )
    } catch (error) {
      console.error('Error saving exercise:', error)
      Alert.alert(
        'Error',
        `Failed to ${isEditing ? 'update' : 'create'} exercise. Please try again.`
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleBodyPart = (part: string) => {
    if (bodyParts.includes(part)) {
      setBodyParts(bodyParts.filter((p) => p !== part))
    } else {
      if (bodyParts.length >= 10) {
        Alert.alert('Limit Reached', 'Maximum 10 body parts allowed')
        return
      }
      setBodyParts([...bodyParts, part])
    }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag) return

    if (tags.includes(tag)) {
      Alert.alert('Duplicate', 'This tag already exists')
      return
    }

    if (tags.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 tags allowed')
      return
    }

    setTags([...tags, tag])
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const getFilteredBodyParts = () => {
    if (bodyRegionFilter === 'Upper Body') {
      return UPPER_BODY_AREAS
    } else if (bodyRegionFilter === 'Lower Body') {
      return LOWER_BODY_AREAS
    }
    return [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS]
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={AppColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Exercise' : 'New Exercise'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={AppColors.primary} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Exercise Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Neck Rolls, Deep Breathing"
              placeholderTextColor={AppColors.textSecondary}
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Short Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of what this exercise does"
              placeholderTextColor={AppColors.textSecondary}
              multiline
              numberOfLines={2}
              maxLength={200}
            />
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.label}>Instructions *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Detailed step-by-step instructions for performing this exercise"
              placeholderTextColor={AppColors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.segmentedControl}>
              {(['Mind', 'Body', 'Soul'] as RoutineCategory[]).map((cat) => {
                const categoryColor = cat === 'Mind' ? AppColors.mind : cat === 'Body' ? AppColors.body : AppColors.soul;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.segmentButton,
                      category === cat && { backgroundColor: categoryColor },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        category === cat && styles.segmentButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Difficulty */}
          <View style={styles.section}>
            <Text style={styles.label}>Difficulty *</Text>
            <View style={styles.segmentedControl}>
              {(['Beginner', 'Intermediate', 'Advanced'] as RoutineDifficulty[]).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.segmentButton,
                    difficulty === diff && styles.segmentButtonActive,
                  ]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      difficulty === diff && styles.segmentButtonTextActive,
                    ]}
                  >
                    {diff}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={styles.label}>Default Duration *</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationInput}>
                <TextInput
                  style={styles.input}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="number-pad"
                  placeholder="0"
                  maxLength={2}
                />
                <Text style={styles.durationLabel}>minutes</Text>
              </View>
              <View style={styles.durationInput}>
                <TextInput
                  style={styles.input}
                  value={durationSeconds}
                  onChangeText={setDurationSeconds}
                  keyboardType="number-pad"
                  placeholder="0"
                  maxLength={2}
                />
                <Text style={styles.durationLabel}>seconds</Text>
              </View>
            </View>
          </View>

          {/* Body Parts (for Body exercises) */}
          {category === 'Body' && (
            <View style={styles.section}>
              <Text style={styles.label}>Target Body Parts</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setBodyPartsModalVisible(true)}
              >
                <Text style={styles.dropdownText}>
                  {bodyParts.length > 0
                    ? `${bodyParts.length} selected`
                    : 'Select body parts'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
              </TouchableOpacity>

              {/* Display Selected Body Parts */}
              {bodyParts.length > 0 && (
                <View style={styles.selectedBodyPartsContainer}>
                  {bodyParts.map((bodyPart) => (
                    <View key={bodyPart} style={styles.selectedBodyPartChip}>
                      <Text style={styles.selectedBodyPartText}>{bodyPart}</Text>
                      <TouchableOpacity onPress={() => toggleBodyPart(bodyPart)}>
                        <Ionicons name="close-circle" size={18} color={AppColors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Tags</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.input, styles.tagInput]}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add a tag..."
                placeholderTextColor={AppColors.textSecondary}
                onSubmitEditing={addTag}
                maxLength={50}
              />
              <TouchableOpacity style={styles.addButton} onPress={addTag}>
                <Ionicons name="add-circle" size={32} color={AppColors.primary} />
              </TouchableOpacity>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagList}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <Ionicons name="close-circle" size={16} color={AppColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Equipment Toggle */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setRequiresEquipment(!requiresEquipment)}
            >
              <Text style={styles.toggleLabel}>Requires Equipment</Text>
              <View style={[styles.toggle, requiresEquipment && styles.toggleActive]}>
                {requiresEquipment && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Official Toggle (health team only) */}
          {isHealthTeam && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setIsOfficial(!isOfficial)}
              >
                <Text style={styles.toggleLabel}>Official Exercise</Text>
                <View style={[styles.toggle, isOfficial && styles.toggleActive]}>
                  {isOfficial && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Body Parts Multi-Select Modal */}
      <Modal
        visible={bodyPartsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBodyPartsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBodyPartsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Body Parts</Text>
              <TouchableOpacity onPress={() => setBodyPartsModalVisible(false)}>
                <Ionicons name="close" size={24} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Body Region Filter */}
            <View style={styles.filterContainer}>
              {(['All', 'Upper Body', 'Lower Body'] as BodyRegion[]).map((region) => (
                <TouchableOpacity
                  key={region}
                  style={[
                    styles.filterButton,
                    bodyRegionFilter === region && styles.filterButtonActive,
                  ]}
                  onPress={() => setBodyRegionFilter(region)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      bodyRegionFilter === region && styles.filterButtonTextActive,
                    ]}
                  >
                    {region}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.modalScrollView}>
              {getFilteredBodyParts().map((bodyPart) => (
                <TouchableOpacity
                  key={bodyPart}
                  style={styles.modalOption}
                  onPress={() => toggleBodyPart(bodyPart)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      bodyParts.includes(bodyPart) && styles.modalOptionTextActive,
                    ]}
                  >
                    {bodyPart}
                  </Text>
                  {bodyParts.includes(bodyPart) && (
                    <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: AppColors.textPrimary,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: AppColors.border,
  },
  segmentButtonActive: {
    backgroundColor: AppColors.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  segmentButtonTextActive: {
    color: AppColors.textPrimary,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  durationInput: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  chipSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  chipText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  toggleDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: AppColors.success,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  dropdownText: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  selectedBodyPartsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedBodyPartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: AppColors.lightGold,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  selectedBodyPartText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
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
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
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
