import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native'
import HapticPressable from '@/components/HapticPressable'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/theme'
import { FilterOption } from '@/types'

type EditorMode = 'body-part' | 'group'

interface FilterOptionEditorModalProps {
  visible: boolean
  onClose: () => void
  onSave: (value: string, groupName: string) => Promise<void>
  existingOption?: FilterOption | null
  existingGroups: string[]
  defaultGroup?: string | null
  mode?: EditorMode
  title?: string
}

export default function FilterOptionEditorModal({
  visible,
  onClose,
  onSave,
  existingOption,
  existingGroups,
  defaultGroup,
  mode = 'body-part',
  title,
}: FilterOptionEditorModalProps) {
  const [value, setValue] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [useNewGroup, setUseNewGroup] = useState(false)
  const [saving, setSaving] = useState(false)

  const isEditing = !!existingOption
  const isGroupMode = mode === 'group'

  useEffect(() => {
    if (visible) {
      if (isGroupMode) {
        // Group creation mode - just need a name
        setValue('')
        setNewGroupName('')
        setSelectedGroup('')
        setUseNewGroup(true)
      } else if (existingOption) {
        setValue(existingOption.value)
        setSelectedGroup(existingOption.group_name ?? '')
        setUseNewGroup(false)
        setNewGroupName('')
      } else {
        setValue('')
        setNewGroupName('')
        // Pre-select the defaultGroup if provided, otherwise first group
        if (defaultGroup) {
          setSelectedGroup(defaultGroup)
          setUseNewGroup(false)
        } else {
          setSelectedGroup(existingGroups[0] ?? '')
          setUseNewGroup(false)
        }
      }
    }
  }, [visible, existingOption, existingGroups, defaultGroup, isGroupMode])

  const handleSave = async (): Promise<void> => {
    if (isGroupMode) {
      const trimmedGroup = newGroupName.trim()
      if (!trimmedGroup) {
        Alert.alert('Error', 'Please enter a group name.')
        return
      }
      if (existingGroups.includes(trimmedGroup)) {
        Alert.alert('Error', 'A group with this name already exists.')
        return
      }
      // Create a placeholder body part to establish the group
      // The user will add real body parts via the "+" in the group
      setSaving(true)
      try {
        await onSave('', trimmedGroup)
        onClose()
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to create group.')
      } finally {
        setSaving(false)
      }
      return
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) {
      Alert.alert('Error', 'Please enter a name.')
      return
    }

    const groupName = useNewGroup ? newGroupName.trim() : selectedGroup
    if (!groupName) {
      Alert.alert('Error', 'Please select or create a group.')
      return
    }

    setSaving(true)
    try {
      await onSave(trimmedValue, groupName)
      onClose()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const getTitle = (): string => {
    if (title) return title
    if (isGroupMode) return 'Add New Group'
    return isEditing ? 'Edit Body Part' : 'Add Body Part'
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <HapticPressable
        style={styles.overlay}
        activeOpacity={1}
        hapticStyle="none"
        onPress={onClose}
      >
        <HapticPressable
          style={styles.content}
          activeOpacity={1}
          hapticStyle="none"
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{getTitle()}</Text>
            <HapticPressable onPress={onClose}>
              <Ionicons name="close" size={24} color={AppColors.textSecondary} />
            </HapticPressable>
          </View>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            {isGroupMode ? (
              <>
                <Text style={styles.label}>Group Name</Text>
                <TextInput
                  style={styles.input}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="e.g., Core, Full Body"
                  placeholderTextColor={AppColors.textPlaceholder}
                  autoFocus
                />
                <Text style={styles.hint}>
                  After creating the group, use the + button to add body parts to it.
                </Text>
              </>
            ) : (
              <>
                {/* Name Input */}
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setValue}
                  placeholder="e.g., Core, Chest"
                  placeholderTextColor={AppColors.textPlaceholder}
                  autoFocus
                />

                {/* Group Selection - only show if no defaultGroup is locked in */}
                {!defaultGroup && (
                  <>
                    <Text style={styles.label}>Group</Text>

                    {existingGroups.map((group) => (
                      <HapticPressable
                        key={group}
                        style={[
                          styles.groupOption,
                          !useNewGroup && selectedGroup === group && styles.groupOptionActive,
                        ]}
                        hapticStyle="selection"
                        onPress={() => {
                          setSelectedGroup(group)
                          setUseNewGroup(false)
                        }}
                      >
                        <Text
                          style={[
                            styles.groupOptionText,
                            !useNewGroup && selectedGroup === group && styles.groupOptionTextActive,
                          ]}
                        >
                          {group}
                        </Text>
                        {!useNewGroup && selectedGroup === group && (
                          <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                        )}
                      </HapticPressable>
                    ))}

                    {/* New Group option */}
                    <HapticPressable
                      style={[styles.groupOption, useNewGroup && styles.groupOptionActive]}
                      hapticStyle="selection"
                      onPress={() => setUseNewGroup(true)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={useNewGroup ? AppColors.primary : AppColors.textSecondary} />
                      <Text style={[styles.groupOptionText, { marginLeft: 8 }, useNewGroup && styles.groupOptionTextActive]}>
                        New Group
                      </Text>
                    </HapticPressable>

                    {useNewGroup && (
                      <TextInput
                        style={[styles.input, { marginTop: 8 }]}
                        value={newGroupName}
                        onChangeText={setNewGroupName}
                        placeholder="e.g., Core, Full Body"
                        placeholderTextColor={AppColors.textPlaceholder}
                      />
                    )}
                  </>
                )}

                {/* Show which group it will be added to if defaultGroup is set */}
                {defaultGroup && (
                  <>
                    <Text style={styles.label}>Group</Text>
                    <View style={[styles.groupOption, styles.groupOptionActive]}>
                      <Text style={[styles.groupOptionText, styles.groupOptionTextActive]}>
                        {defaultGroup}
                      </Text>
                      <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          {/* Save Button */}
          <HapticPressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            hapticStyle="medium"
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : isGroupMode ? 'Create Group' : isEditing ? 'Update' : 'Add'}
            </Text>
          </HapticPressable>
        </HapticPressable>
      </HapticPressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  form: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  hint: {
    fontSize: 13,
    color: AppColors.textTertiary,
    marginTop: 8,
    lineHeight: 18,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  groupOptionActive: {
    backgroundColor: AppColors.primary + '20',
  },
  groupOptionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  groupOptionTextActive: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primaryText,
  },
})
