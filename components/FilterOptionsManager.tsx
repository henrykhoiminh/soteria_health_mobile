import HapticPressable from '@/components/HapticPressable'
import { AppColors } from '@/constants/theme'
import { useFilterOptions } from '@/lib/contexts/FilterOptionsContext'
import {
  createFilterOption,
  deleteFilterOption,
  getAllGroupedFilterOptions,
  updateFilterOption,
} from '@/lib/utils/filter-options'
import { FilterOption, FilterOptionGroup } from '@/types'
import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useEffect, useRef, useState } from 'react'
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
  View,
} from 'react-native'

interface FilterOptionsManagerProps {
  onBack: () => void
}

export default function FilterOptionsManager({ onBack }: FilterOptionsManagerProps) {
  const { refreshFilterOptions } = useFilterOptions()
  const [groups, setGroups] = useState<FilterOptionGroup[]>([])
  const [loading, setLoading] = useState(true)

  // Per-group input state: { "Upper Body": "Che...", "Lower Body": "" }
  const [groupInputs, setGroupInputs] = useState<Record<string, string>>({})
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const newGroupInputRef = useRef<TextInput>(null)

  // Group edit modal state
  const [editingGroup, setEditingGroup] = useState<FilterOptionGroup | null>(null)
  const [renameValue, setRenameValue] = useState('')

  /** Full reload from DB - only used on initial mount */
  const loadData = useCallback(async () => {
    try {
      const data = await getAllGroupedFilterOptions('body_part')
      setGroups(data)
    } catch (error) {
      console.error('Error loading filter options:', error)
      Alert.alert('Error', 'Failed to load body parts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const setGroupInput = (groupName: string, value: string): void => {
    setGroupInputs(prev => ({ ...prev, [groupName]: value }))
  }

  const handleAddBodyPart = async (groupName: string): Promise<void> => {
    const value = (groupInputs[groupName] ?? '').trim()
    if (!value) return

    // Check for duplicates across all groups
    const allValues = groups.flatMap(g => g.options.map(o => o.value.toLowerCase()))
    if (allValues.includes(value.toLowerCase())) {
      Alert.alert('Duplicate', `"${value}" already exists.`)
      return
    }

    const targetGroup = groups.find(g => g.group_name === groupName)
    const groupOrder = targetGroup ? targetGroup.group_order : groups.length
    const tempId = `temp-${Date.now()}`

    // Optimistic: add chip immediately
    const optimisticOption: FilterOption = {
      id: tempId,
      filter_type: 'body_part',
      value,
      group_name: groupName,
      group_order: groupOrder,
      item_order: targetGroup ? targetGroup.options.length : 0,
      is_enabled: true,
      created_by: null,
      created_at: new Date().toISOString(),
    }
    setGroups(prev =>
      prev.map(g =>
        g.group_name === groupName
          ? { ...g, options: [...g.options, optimisticOption] }
          : g
      )
    )
    setGroupInput(groupName, '')

    // Persist in background
    try {
      await createFilterOption({
        filter_type: 'body_part',
        value,
        group_name: groupName,
        group_order: groupOrder,
      })
      // Silently sync real IDs from DB
      const data = await getAllGroupedFilterOptions('body_part')
      setGroups(data)
      refreshFilterOptions()
    } catch (error: any) {
      // Revert optimistic add
      setGroups(prev =>
        prev.map(g =>
          g.group_name === groupName
            ? { ...g, options: g.options.filter(o => o.id !== tempId) }
            : g
        )
      )
      Alert.alert('Error', error.message || 'Failed to add body part.')
    }
  }

  const handleRemove = (option: FilterOption): void => {
    Alert.alert(
      'Remove Body Part',
      `Remove "${option.value}"? Existing routines tagged with it won't be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Optimistic: remove chip immediately
            const previousGroups = groups
            setGroups(prev =>
              prev.map(g => ({
                ...g,
                options: g.options.filter(o => o.id !== option.id),
              }))
            )

            // Persist in background
            try {
              await deleteFilterOption(option.id)
              refreshFilterOptions()
            } catch (error: any) {
              // Revert on failure
              setGroups(previousGroups)
              const message = error.message?.includes('policy')
                ? 'Only admins can remove body parts.'
                : 'Failed to remove body part.'
              Alert.alert('Error', message)
            }
          },
        },
      ]
    )
  }

  const handleAddGroup = async (): Promise<void> => {
    const name = newGroupName.trim()
    if (!name) return

    const existingNames = groups.map(g => g.group_name.toLowerCase())
    if (existingNames.includes(name.toLowerCase())) {
      Alert.alert('Duplicate', `"${name}" group already exists.`)
      return
    }

    // Group will appear once its first body part is added
    // Initialize it with an empty input
    setGroupInputs(prev => ({ ...prev, [name]: '' }))
    setGroups(prev => [
      ...prev,
      { group_name: name, group_order: prev.length, options: [] },
    ])
    setNewGroupName('')
    setShowNewGroupInput(false)
  }

  const handleOpenGroupEditor = (group: FilterOptionGroup): void => {
    setEditingGroup(group)
    setRenameValue(group.group_name)
  }

  const handleRenameGroup = async (): Promise<void> => {
    if (!editingGroup) return
    const newName = renameValue.trim()
    if (!newName) return

    if (newName === editingGroup.group_name) {
      setEditingGroup(null)
      return
    }

    const existingNames = groups.map(g => g.group_name.toLowerCase())
    if (existingNames.includes(newName.toLowerCase())) {
      Alert.alert('Duplicate', `"${newName}" group already exists.`)
      return
    }

    const oldName = editingGroup.group_name

    // Optimistic: rename in UI immediately
    setGroups(prev =>
      prev.map(g =>
        g.group_name === oldName ? { ...g, group_name: newName } : g
      )
    )
    // Update input key to match new name
    setGroupInputs(prev => {
      const updated = { ...prev }
      updated[newName] = updated[oldName] ?? ''
      delete updated[oldName]
      return updated
    })
    setEditingGroup(null)

    // Persist: update group_name on all options in this group
    try {
      const targetOptions = editingGroup.options
      await Promise.all(
        targetOptions.map(o => updateFilterOption(o.id, { group_name: newName }))
      )
      refreshFilterOptions()
    } catch (error: any) {
      // Revert
      setGroups(prev =>
        prev.map(g =>
          g.group_name === newName ? { ...g, group_name: oldName } : g
        )
      )
      Alert.alert('Error', 'Failed to rename group.')
    }
  }

  const handleDeleteGroup = (): void => {
    if (!editingGroup) return
    const group = editingGroup
    const count = group.options.length
    const message = count > 0
      ? `Delete "${group.group_name}" and its ${count} body part${count > 1 ? 's' : ''}? Existing routines won't be affected.`
      : `Delete the empty "${group.group_name}" group?`

    Alert.alert('Delete Group', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const previousGroups = groups
          setGroups(prev => prev.filter(g => g.group_name !== group.group_name))
          setEditingGroup(null)

          try {
            await Promise.all(group.options.map(o => deleteFilterOption(o.id)))
            refreshFilterOptions()
          } catch (error: any) {
            setGroups(previousGroups)
            const msg = error.message?.includes('policy')
              ? 'Only admins can delete body parts.'
              : 'Failed to delete group.'
            Alert.alert('Error', msg)
          }
        },
      },
    ])
  }

  const headerContent = (
    <View style={styles.pageHeader}>
      <HapticPressable onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={AppColors.textSecondary} />
      </HapticPressable>
      <Text style={styles.pageTitle}>Body Parts</Text>
      <Text style={styles.pageSubtitle}>
        Edit body parts used for tagging and filtering
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        {headerContent}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {headerContent}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {groups.map((group) => (
          <View key={group.group_name} style={styles.groupSection}>
            {/* Group label */}
            <View style={styles.groupLabelRow}>
              <Text style={styles.groupLabel}>{group.group_name}</Text>
              <HapticPressable
                onPress={() => handleOpenGroupEditor(group)}
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={16} color={AppColors.textTertiary} />
              </HapticPressable>
            </View>

            {/* Chips + inline input */}
            <View style={styles.chipsContainer}>
              {group.options.map((option) => (
                <View key={option.id} style={styles.chip}>
                  <Text style={styles.chipText}>{option.value}</Text>
                  <HapticPressable
                    onPress={() => handleRemove(option)}
                    hitSlop={8}
                    hapticStyle="medium"
                  >
                    <Ionicons name="close-circle" size={18} color={AppColors.textTertiary} />
                  </HapticPressable>
                </View>
              ))}
            </View>

            {/* Add input for this group */}
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.addInput}
                value={groupInputs[group.group_name] ?? ''}
                onChangeText={(text) => setGroupInput(group.group_name, text)}
                placeholder={`Add to ${group.group_name}...`}
                placeholderTextColor={AppColors.textPlaceholder}
                returnKeyType="done"
                onSubmitEditing={() => handleAddBodyPart(group.group_name)}
              />
              <HapticPressable
                onPress={() => handleAddBodyPart(group.group_name)}
                style={styles.addButton}
                disabled={!(groupInputs[group.group_name] ?? '').trim()}
              >
                <Ionicons
                  name="add-circle"
                  size={28}
                  color={
                    (groupInputs[group.group_name] ?? '').trim()
                      ? AppColors.primary
                      : AppColors.textTertiary
                  }
                />
              </HapticPressable>
            </View>
          </View>
        ))}

        {/* Add new group */}
        {showNewGroupInput ? (
          <View style={styles.newGroupSection}>
            <Text style={styles.groupLabel}>New Group</Text>
            <View style={styles.addInputRow}>
              <TextInput
                ref={newGroupInputRef}
                style={styles.addInput}
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="Group name..."
                placeholderTextColor={AppColors.textPlaceholder}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddGroup}
              />
              <HapticPressable
                onPress={handleAddGroup}
                style={styles.addButton}
                disabled={!newGroupName.trim()}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={28}
                  color={newGroupName.trim() ? AppColors.success : AppColors.textTertiary}
                />
              </HapticPressable>
              <HapticPressable
                onPress={() => {
                  setShowNewGroupInput(false)
                  setNewGroupName('')
                }}
                style={styles.addButton}
              >
                <Ionicons name="close-circle" size={28} color={AppColors.textTertiary} />
              </HapticPressable>
            </View>
          </View>
        ) : (
          <HapticPressable
            style={styles.addGroupButton}
            onPress={() => setShowNewGroupInput(true)}
          >
            <Ionicons name="add" size={20} color={AppColors.primaryText} />
            <Text style={styles.addGroupText}>Add New Group</Text>
          </HapticPressable>
        )}
      </ScrollView>

      {/* Group Edit Modal */}
      <Modal visible={!!editingGroup} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <HapticPressable
            style={styles.modalDismiss}
            activeOpacity={1}
            hapticStyle="none"
            onPress={() => setEditingGroup(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Group</Text>
              <HapticPressable onPress={() => setEditingGroup(null)}>
                <Ionicons name="close" size={24} color={AppColors.textSecondary} />
              </HapticPressable>
            </View>

            <Text style={styles.modalLabel}>Group Name</Text>
            <TextInput
              style={styles.modalInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Group name"
              placeholderTextColor={AppColors.textPlaceholder}
              returnKeyType="done"
              onSubmitEditing={handleRenameGroup}
            />

            <HapticPressable
              style={styles.modalRenameButton}
              onPress={handleRenameGroup}
              disabled={!renameValue.trim() || renameValue.trim() === editingGroup?.group_name}
            >
              <Text
                style={[
                  styles.modalRenameText,
                  (!renameValue.trim() || renameValue.trim() === editingGroup?.group_name) &&
                    styles.modalButtonDisabled,
                ]}
              >
                Rename
              </Text>
            </HapticPressable>

            <HapticPressable
              style={styles.modalDeleteButton}
              onPress={handleDeleteGroup}
              hapticStyle="medium"
            >
              <Ionicons name="trash-outline" size={18} color={AppColors.destructive} />
              <Text style={styles.modalDeleteText}>Delete Group</Text>
            </HapticPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  pageHeader: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: AppColors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  pageSubtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
  },
  groupSection: {
    marginBottom: 24,
  },
  groupLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textPrimary,
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: AppColors.textPrimary,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  newGroupSection: {
    marginBottom: 16,
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  addGroupText: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.primaryText,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Group edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  modalRenameButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalRenameText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primaryText,
  },
  modalButtonDisabled: {
    opacity: 0.4,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.destructive + '40',
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.destructive,
  },
})
