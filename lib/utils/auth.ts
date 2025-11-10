import { supabase } from '../supabase/client'
import { Profile } from '@/types'
import { decode } from 'base64-arraybuffer'

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
  try {
    // Fetch the image and convert to base64
    const response = await fetch(imageUri)
    const blob = await response.blob()
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(blob)
    })

    // Convert ArrayBuffer to base64
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    // Generate unique filename
    const fileExt = imageUri.split('.').pop() || 'jpg'
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `profile-pictures/${fileName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64), {
        contentType: `image/${fileExt}`,
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    throw error
  }
}

/**
 * Calculate the number of days since the user started their journey
 * @param journeyStartedAt - ISO timestamp when journey began
 * @returns Number of days since journey start
 */
export function calculateJourneyDays(journeyStartedAt: string | null): number {
  if (!journeyStartedAt) return 0

  const startDate = new Date(journeyStartedAt)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Update recovery-specific information for a user
 * @param userId - User ID
 * @param recoveryAreas - Array of body parts being recovered
 * @param recoveryGoals - Array of predefined recovery goals
 */
export async function updateRecoveryInfo(
  userId: string,
  recoveryAreas: string[],
  recoveryGoals: string[]
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      recovery_areas: recoveryAreas,
      recovery_goals: recoveryGoals,
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Set or reset the journey start date for a user
 * @param userId - User ID
 * @param startDate - ISO timestamp (defaults to now)
 */
export async function setJourneyStartDate(userId: string, startDate?: string) {
  const { data, error} = await supabase
    .from('profiles')
    .update({
      journey_started_at: startDate || new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * HARD RESET: Completely resets all user data and sends them back through onboarding
 * WARNING: This deletes ALL user progress, stats, and journey data
 * @param userId - User ID
 */
export async function hardResetUserData(userId: string) {
  try {
    // 1. Delete all daily progress records
    const { error: progressError } = await supabase
      .from('daily_progress')
      .delete()
      .eq('user_id', userId)

    if (progressError) throw progressError

    // 2. Delete all routine completions
    const { error: completionsError } = await supabase
      .from('routine_completions')
      .delete()
      .eq('user_id', userId)

    if (completionsError) throw completionsError

    // 3. Delete user stats
    const { error: statsError } = await supabase
      .from('user_stats')
      .delete()
      .eq('user_id', userId)

    if (statsError) throw statsError

    // 4. Delete journey goals
    const { error: goalsError } = await supabase
      .from('journey_goals')
      .delete()
      .eq('user_id', userId)

    if (goalsError) throw goalsError

    // 5. Reset profile to initial state (keep name and email, clear everything else)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        journey_focus: null,
        journey_started_at: null,
        recovery_areas: [],
        recovery_goals: [],
        fitness_level: null,
        injuries: [],
        age: null,
        // Keep full_name and profile_picture_url
      })
      .eq('id', userId)

    if (profileError) throw profileError

    return { success: true }
  } catch (error) {
    console.error('Error during hard reset:', error)
    throw error
  }
}
