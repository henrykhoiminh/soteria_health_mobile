/**
 * Exercise Editor Modal
 *
 * Modal for creating or editing exercises
 * Used by health team members
 */

import { Ionicons } from '@expo/vector-icons'
import { ResizeMode, Video } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'

// Video compression is only available in development builds, not Expo Go
let VideoCompressor: any = null
try {
  VideoCompressor = require('react-native-compressor').Video
} catch {
  // react-native-compressor not available (Expo Go)
  console.log('Video compression not available - using Expo Go')
}
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import HapticPressable from '@/components/HapticPressable'
import { AppColors } from '../constants/theme'
import {
  uploadExerciseVideo,
  validateFileSize,
} from '../lib/utils/exercise-media'
import { createExercise, updateExercise } from '../lib/utils/exercises'
import type { BodyRegion, ExerciseLibraryItem, RoutineCategory, RoutineDifficulty } from '../types'
import { useFilterOptions } from '../lib/contexts/FilterOptionsContext'

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
  const { upperBodyParts, lowerBodyParts } = useFilterOptions();
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

  // Demo video state
  const [demoVideoUri, setDemoVideoUri] = useState<string | null>(null)
  const [demoVideoSizeMB, setDemoVideoSizeMB] = useState<number | null>(null)
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [compressingVideo, setCompressingVideo] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)

  const isEditing = !!exercise

  // Load exercise data when editing
  useEffect(() => {
    if (!visible) return
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
      // Load existing demo video URL
      setExistingVideoUrl(exercise.demo_video_url || null)
      setDemoVideoUri(null)
      setDemoVideoSizeMB(null)
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
      // Reset demo video
      setDemoVideoUri(null)
      setDemoVideoSizeMB(null)
      setExistingVideoUrl(null)
    }
  }, [visible, exercise, isHealthTeam])

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
      // Generate a temp ID for new exercises (will be replaced by actual ID after creation)
      const tempId = isEditing && exercise ? exercise.id : `new-${Date.now()}`

      // Upload new video if selected
      let finalVideoUrl = existingVideoUrl

      if (demoVideoUri) {
        setUploadingVideo(true)
        try {
          finalVideoUrl = await uploadExerciseVideo(tempId, demoVideoUri)
        } catch (uploadError: any) {
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload video')
          setSaving(false)
          setUploadingVideo(false)
          return
        }
        setUploadingVideo(false)
      }

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
        demo_video_url: finalVideoUrl || undefined,
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
      setUploadingVideo(false)
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

  // Process video after selection (shared by record and library pick)
  const processSelectedVideo = async (originalUri: string) => {
    try {
      // Check original file size
      const originalValidation = await validateFileSize(originalUri, 500) // Allow checking up to 500MB
      const originalSizeMB = originalValidation.sizeMB

      // If video is over 30MB and compression is available, compress it
      if (originalSizeMB > 30 && VideoCompressor) {
        setCompressingVideo(true)
        setCompressionProgress(0)

        try {
          const compressedUri = await VideoCompressor.compress(
            originalUri,
            {
              compressionMethod: 'auto',
              maxSize: 720, // Max dimension 720p for demo videos
              minimumFileSizeForCompress: 10, // Only compress if over 10MB
            },
            (progress: number) => {
              setCompressionProgress(progress)
            }
          )

          setCompressingVideo(false)

          // Validate compressed file size
          const validation = await validateFileSize(compressedUri, 100)
          if (!validation.valid) {
            Alert.alert(
              'Video Still Too Large',
              `After compression, the video is ${validation.sizeMB.toFixed(1)}MB (was ${originalSizeMB.toFixed(1)}MB).\n\nPlease record a shorter video.`
            )
            return
          }

          setDemoVideoUri(compressedUri)
          setDemoVideoSizeMB(validation.sizeMB)

          // Show compression result
          if (originalSizeMB > validation.sizeMB * 1.5) {
            Alert.alert(
              'Video Compressed',
              `Reduced from ${originalSizeMB.toFixed(1)}MB to ${validation.sizeMB.toFixed(1)}MB`
            )
          }
        } catch (compressionError) {
          setCompressingVideo(false)
          console.error('Compression error:', compressionError)
          Alert.alert('Compression Failed', 'Could not compress the video. Please try a different video.')
        }
      } else {
        // Video compression not available or video is small enough - use as-is
        const validation = await validateFileSize(originalUri, 100)
        if (!validation.valid) {
          const message = VideoCompressor
            ? `Your video is ${validation.sizeMB.toFixed(1)}MB but the maximum allowed size is 100MB.\n\nPlease select a shorter or lower resolution video.`
            : `Your video is ${validation.sizeMB.toFixed(1)}MB but the maximum allowed size is 100MB.\n\nVideo compression requires a development build. Please select a smaller video or run: eas build --profile development-device --platform ios`
          Alert.alert('Video Too Large', message)
          return
        }
        setDemoVideoUri(originalUri)
        setDemoVideoSizeMB(validation.sizeMB)
      }
    } catch (error) {
      setCompressingVideo(false)
      console.error('Error processing video:', error)
      Alert.alert('Error', 'Failed to process video')
    }
  }

  // Record video with camera
  const handleRecordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera to record demo videos.'
        )
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 120, // 2 minute max for demo videos
      })

      if (!result.canceled && result.assets[0]) {
        await processSelectedVideo(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error recording video:', error)
      Alert.alert('Error', 'Failed to record video')
    }
  }

  // Pick video from library
  const handlePickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to add demo videos.'
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await processSelectedVideo(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error picking video:', error)
      Alert.alert('Error', 'Failed to select video')
    }
  }

  // Show video source options
  const handleAddVideo = () => {
    Alert.alert(
      'Add Demo Video',
      'Choose how to add a video',
      [
        {
          text: 'Record Video',
          onPress: handleRecordVideo,
        },
        {
          text: 'Choose from Library',
          onPress: handlePickFromLibrary,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    )
  }

  const handleRemoveVideo = () => {
    setDemoVideoUri(null)
    setDemoVideoSizeMB(null)
    setExistingVideoUrl(null)
  }

  const getFilteredBodyParts = (): readonly string[] => {
    if (bodyRegionFilter === 'Upper Body') {
      return upperBodyParts
    } else if (bodyRegionFilter === 'Lower Body') {
      return lowerBodyParts
    }
    return [...upperBodyParts, ...lowerBodyParts]
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <HapticPressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={AppColors.textPrimary} />
          </HapticPressable>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Exercise' : 'New Exercise'}
          </Text>
          <HapticPressable
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={AppColors.primary} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </HapticPressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          {/* Demo Video */}
          <View style={styles.section}>
            <Text style={styles.label}>Demo Video</Text>
            <Text style={styles.helperText}>
              Add a video to demonstrate this exercise (max 100MB)
            </Text>

            <View style={styles.mediaRow}>
              {demoVideoUri || existingVideoUrl ? (
                <View style={styles.mediaPreviewContainer}>
                  <Video
                    source={{ uri: demoVideoUri || existingVideoUrl || '' }}
                    style={styles.videoPreview}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted
                    useNativeControls={false}
                  />
                  <View style={styles.videoPlayIcon}>
                    <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                  </View>
                  <HapticPressable
                    style={styles.removeMediaButton}
                    onPress={handleRemoveVideo}
                    hapticStyle="medium"
                  >
                    <Ionicons name="close-circle" size={24} color={AppColors.destructive} />
                  </HapticPressable>
                  {uploadingVideo && (
                    <View style={styles.mediaUploadingOverlay}>
                      <ActivityIndicator size="small" color={AppColors.primary} />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                  {demoVideoSizeMB && !uploadingVideo && (
                    <View style={styles.videoSizeBadge}>
                      <Text style={styles.videoSizeText}>{demoVideoSizeMB.toFixed(1)}MB</Text>
                    </View>
                  )}
                </View>
              ) : compressingVideo ? (
                <View style={styles.compressionContainer}>
                  <ActivityIndicator size="large" color={AppColors.primary} />
                  <Text style={styles.compressionText}>Compressing video...</Text>
                  <View style={styles.compressionProgressBar}>
                    <View
                      style={[
                        styles.compressionProgressFill,
                        { width: `${Math.round(compressionProgress * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.compressionPercent}>
                    {Math.round(compressionProgress * 100)}%
                  </Text>
                </View>
              ) : (
                <HapticPressable
                  style={styles.mediaPickerButton}
                  onPress={handleAddVideo}
                >
                  <Ionicons name="videocam-outline" size={24} color={AppColors.primary} />
                  <Text style={styles.mediaPickerText}>Add Video</Text>
                </HapticPressable>
              )}
            </View>
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
                  <HapticPressable
                    key={cat}
                    style={[
                      styles.segmentButton,
                      category === cat && { backgroundColor: categoryColor },
                    ]}
                    onPress={() => setCategory(cat)}
                    hapticStyle="selection"
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        category === cat && styles.segmentButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </HapticPressable>
                );
              })}
            </View>
          </View>

          {/* Difficulty */}
          <View style={styles.section}>
            <Text style={styles.label}>Difficulty *</Text>
            <View style={styles.segmentedControl}>
              {(['Beginner', 'Intermediate', 'Advanced'] as RoutineDifficulty[]).map((diff) => (
                <HapticPressable
                  key={diff}
                  style={[
                    styles.segmentButton,
                    difficulty === diff && styles.segmentButtonActive,
                  ]}
                  onPress={() => setDifficulty(diff)}
                  hapticStyle="selection"
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      difficulty === diff && styles.segmentButtonTextActive,
                    ]}
                  >
                    {diff}
                  </Text>
                </HapticPressable>
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
              <HapticPressable
                style={styles.dropdownButton}
                onPress={() => setBodyPartsModalVisible(true)}
              >
                <Text style={styles.dropdownText}>
                  {bodyParts.length > 0
                    ? `${bodyParts.length} selected`
                    : 'Select body parts'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
              </HapticPressable>

              {/* Display Selected Body Parts */}
              {bodyParts.length > 0 && (
                <View style={styles.selectedBodyPartsContainer}>
                  {bodyParts.map((bodyPart) => (
                    <View key={bodyPart} style={styles.selectedBodyPartChip}>
                      <Text style={styles.selectedBodyPartText}>{bodyPart}</Text>
                      <HapticPressable onPress={() => toggleBodyPart(bodyPart)}>
                        <Ionicons name="close-circle" size={18} color={AppColors.primary} />
                      </HapticPressable>
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
              <HapticPressable style={styles.addButton} onPress={addTag}>
                <Ionicons name="add-circle" size={32} color={AppColors.primary} />
              </HapticPressable>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagList}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <HapticPressable onPress={() => removeTag(tag)}>
                      <Ionicons name="close-circle" size={16} color={AppColors.textSecondary} />
                    </HapticPressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Equipment Toggle */}
          <View style={styles.section}>
            <HapticPressable
              style={styles.toggleRow}
              onPress={() => setRequiresEquipment(!requiresEquipment)}
              hapticStyle="selection"
            >
              <Text style={styles.toggleLabel}>Requires Equipment</Text>
              <View style={[styles.toggle, requiresEquipment && styles.toggleActive]}>
                {requiresEquipment && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </View>
            </HapticPressable>
          </View>

          {/* Official Toggle (health team only) */}
          {isHealthTeam && (
            <View style={styles.section}>
              <HapticPressable
                style={styles.toggleRow}
                onPress={() => setIsOfficial(!isOfficial)}
                hapticStyle="selection"
              >
                <Text style={styles.toggleLabel}>Official Exercise</Text>
                <View style={[styles.toggle, isOfficial && styles.toggleActive]}>
                  {isOfficial && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </View>
              </HapticPressable>
            </View>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
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
              <HapticPressable onPress={() => setBodyPartsModalVisible(false)}>
                <Ionicons name="close" size={24} color={AppColors.textSecondary} />
              </HapticPressable>
            </View>

            {/* Body Region Filter */}
            <View style={styles.filterContainer}>
              {(['All', 'Upper Body', 'Lower Body'] as BodyRegion[]).map((region) => (
                <HapticPressable
                  key={region}
                  style={[
                    styles.filterButton,
                    bodyRegionFilter === region && styles.filterButtonActive,
                  ]}
                  onPress={() => setBodyRegionFilter(region)}
                  hapticStyle="selection"
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      bodyRegionFilter === region && styles.filterButtonTextActive,
                    ]}
                  >
                    {region}
                  </Text>
                </HapticPressable>
              ))}
            </View>

            <ScrollView style={styles.modalScrollView}>
              {getFilteredBodyParts().map((bodyPart) => (
                <HapticPressable
                  key={bodyPart}
                  style={styles.modalOption}
                  onPress={() => toggleBodyPart(bodyPart)}
                  hapticStyle="selection"
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
                </HapticPressable>
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
    color: AppColors.primaryText,
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
    color: AppColors.primaryText,
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
  // Media picker styles
  helperText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 16,
  },
  mediaRow: {
    marginBottom: 16,
  },
  mediaPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderStyle: 'dashed',
    paddingVertical: 24,
  },
  mediaPickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.primary,
  },
  mediaPreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: AppColors.surface,
  },
  videoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: AppColors.background,
  },
  videoPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  mediaUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadingText: {
    color: AppColors.textPrimary,
    fontSize: 14,
    marginTop: 8,
  },
  videoSizeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoSizeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  compressionContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: 24,
    alignItems: 'center',
  },
  compressionText: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.textPrimary,
    marginTop: 12,
    marginBottom: 16,
  },
  compressionProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: AppColors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  compressionProgressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 4,
  },
  compressionPercent: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
})
