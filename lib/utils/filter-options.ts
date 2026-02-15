import { supabase } from '../supabase/client'
import { FilterOption, FilterOptionGroup } from '@/types'

// ============================================================================
// Fetch Functions
// ============================================================================

/** Get enabled filter options for a given type, ordered by group then item */
export async function getFilterOptions(filterType: string): Promise<FilterOption[]> {
  const { data, error } = await supabase
    .from('filter_options')
    .select('*')
    .eq('filter_type', filterType)
    .eq('is_enabled', true)
    .order('group_order', { ascending: true })
    .order('item_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Get enabled filter options grouped by group_name */
export async function getGroupedFilterOptions(filterType: string): Promise<FilterOptionGroup[]> {
  const options = await getFilterOptions(filterType)
  return groupOptions(options)
}

/** Get ALL filter options (including disabled) for admin management UI */
export async function getAllFilterOptions(filterType: string): Promise<FilterOption[]> {
  const { data, error } = await supabase
    .from('filter_options')
    .select('*')
    .eq('filter_type', filterType)
    .order('group_order', { ascending: true })
    .order('item_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Get all filter options (including disabled) grouped by group_name, for admin UI */
export async function getAllGroupedFilterOptions(filterType: string): Promise<FilterOptionGroup[]> {
  const options = await getAllFilterOptions(filterType)
  return groupOptions(options)
}

// ============================================================================
// CRUD Functions
// ============================================================================

interface CreateFilterOptionInput {
  filter_type: string
  value: string
  group_name: string
  group_order?: number
  item_order?: number
}

/** Create a new filter option */
export async function createFilterOption(input: CreateFilterOptionInput): Promise<FilterOption> {
  // If no item_order provided, place at end of group
  let itemOrder = input.item_order
  if (itemOrder === undefined) {
    const { data: existing } = await supabase
      .from('filter_options')
      .select('item_order')
      .eq('filter_type', input.filter_type)
      .eq('group_name', input.group_name)
      .order('item_order', { ascending: false })
      .limit(1)

    itemOrder = existing && existing.length > 0 ? existing[0].item_order + 1 : 0
  }

  const { data, error } = await supabase
    .from('filter_options')
    .insert({
      filter_type: input.filter_type,
      value: input.value,
      group_name: input.group_name,
      group_order: input.group_order ?? 0,
      item_order: itemOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

interface UpdateFilterOptionInput {
  value?: string
  group_name?: string
  group_order?: number
  item_order?: number
  is_enabled?: boolean
}

/** Update an existing filter option */
export async function updateFilterOption(
  id: string,
  updates: UpdateFilterOptionInput
): Promise<FilterOption> {
  const { data, error } = await supabase
    .from('filter_options')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Hard delete a filter option (admin only) */
export async function deleteFilterOption(id: string): Promise<void> {
  const { error } = await supabase
    .from('filter_options')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/** Batch update item_order for reordering within a group */
export async function reorderFilterOptions(
  filterType: string,
  groupName: string,
  orderedIds: string[]
): Promise<void> {
  // Update each option's item_order based on its position in the array
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('filter_options')
      .update({ item_order: index })
      .eq('id', id)
      .eq('filter_type', filterType)
      .eq('group_name', groupName)
  )

  const results = await Promise.all(updates)
  const firstError = results.find(r => r.error)
  if (firstError?.error) throw firstError.error
}

/** Rename a body part with cascade to routines, exercises, and profiles */
export async function renameBodyPart(oldValue: string, newValue: string): Promise<void> {
  const { error } = await supabase.rpc('rename_body_part', {
    old_value: oldValue,
    new_value: newValue,
  })

  if (error) throw error
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

/** Get body parts grouped by Upper Body / Lower Body */
export async function getBodyParts(): Promise<FilterOptionGroup[]> {
  return getGroupedFilterOptions('body_part')
}

// ============================================================================
// Helpers
// ============================================================================

/** Group a flat list of filter options into FilterOptionGroup[] */
function groupOptions(options: FilterOption[]): FilterOptionGroup[] {
  const groupMap = new Map<string, FilterOptionGroup>()

  for (const option of options) {
    const groupName = option.group_name ?? 'Other'
    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, {
        group_name: groupName,
        group_order: option.group_order,
        options: [],
      })
    }
    groupMap.get(groupName)!.options.push(option)
  }

  // Sort groups by group_order
  return Array.from(groupMap.values()).sort((a, b) => a.group_order - b.group_order)
}
