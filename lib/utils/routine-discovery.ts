/**
 * Routine Discovery System Utilities
 * Handles saving, discovering, and filtering public routines
 */

import { supabase } from '../supabase/client';
import {
  Routine,
  RoutineSortOption,
  RoutineFilters,
  RoutineDiscoverParams,
  JourneyFocus,
} from '@/types';

// =====================================================
// SAVE / UNSAVE ROUTINES
// =====================================================

/**
 * Save a routine to user's collection
 */
export async function saveRoutine(userId: string, routineId: string): Promise<void> {
  const { error } = await supabase
    .from('routine_saves')
    .insert({
      user_id: userId,
      routine_id: routineId,
    });

  if (error) {
    // Check if already saved
    if (error.code === '23505') {
      throw new Error('Routine already saved');
    }
    throw new Error('Failed to save routine');
  }
}

/**
 * Unsave a routine from user's collection
 */
export async function unsaveRoutine(userId: string, routineId: string): Promise<void> {
  const { error } = await supabase
    .from('routine_saves')
    .delete()
    .eq('user_id', userId)
    .eq('routine_id', routineId);

  if (error) {
    throw new Error('Failed to unsave routine');
  }
}

/**
 * Check if user has saved a routine
 */
export async function isRoutineSaved(userId: string, routineId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('routine_saves')
    .select('id')
    .eq('user_id', userId)
    .eq('routine_id', routineId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error checking saved status:', error);
  }

  return !!data;
}

/**
 * Get user's saved routines
 */
export async function getSavedRoutines(userId: string): Promise<Routine[]> {
  const { data, error} = await supabase
    .from('routine_saves')
    .select(`
      routine_id,
      routines (
        id,
        name,
        category,
        description,
        duration_minutes,
        difficulty,
        journey_focus,
        benefits,
        exercises,
        completion_count,
        is_custom,
        created_by,
        created_at,
        tags,
        body_parts,
        is_public,
        save_count,
        author_type,
        official_author,
        profiles (
          full_name,
          username,
          profile_picture_url
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved routines:', error);
    throw new Error('Failed to load saved routines');
  }

  // Extract routines from the join
  const routines = data
    .map((item: any) => item.routines)
    .filter((routine: any) => routine !== null);

  // Add is_saved flag and map profile data
  return routines.map((routine: any) => ({
    ...routine,
    is_saved: true,
    creator_name: routine.profiles?.full_name,
    creator_username: routine.profiles?.username,
    creator_avatar: routine.profiles?.profile_picture_url,
  }));
}

// =====================================================
// DISCOVER FEED
// =====================================================

/**
 * Build SQL query for discover feed based on filters
 */
function buildDiscoverQuery(
  userId: string,
  params: RoutineDiscoverParams
) {
  const { sort = 'popular', filters = {}, limit = 50, offset = 0 } = params;

  // Start with base query - all public routines
  let query = supabase
    .from('routines')
    .select(`
      id,
      name,
      category,
      description,
      duration_minutes,
      difficulty,
      journey_focus,
      benefits,
      exercises,
      completion_count,
      is_custom,
      created_by,
      created_at,
      tags,
      body_parts,
      is_public,
      save_count,
      author_type,
      official_author,
      profiles (
        full_name,
        username,
        profile_picture_url
      )
    `)
    .eq('is_public', true);

  // Apply filters
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters.journeyFocus) {
    query = query.contains('journey_focus', [filters.journeyFocus]);
  }

  if (filters.source === 'official') {
    query = query.eq('is_custom', false);
  } else if (filters.source === 'community') {
    query = query.eq('is_custom', true);
  }

  if (filters.durationMin !== undefined) {
    query = query.gte('duration_minutes', filters.durationMin);
  }

  if (filters.durationMax !== undefined) {
    query = query.lte('duration_minutes', filters.durationMax);
  }

  if (filters.searchQuery && filters.searchQuery.trim()) {
    // Search in name and description
    const searchTerm = `%${filters.searchQuery.trim()}%`;
    query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
  }

  // Apply sorting
  switch (sort) {
    case 'popular':
      query = query.order('completion_count', { ascending: false });
      break;
    case 'most_saved':
      query = query.order('save_count', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'trending':
      // For trending, we'll sort by save_count first, then filter by recent saves in post-processing
      query = query.order('save_count', { ascending: false });
      break;
  }

  // Add secondary sort by name for consistency
  query = query.order('name', { ascending: true });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  return query;
}

/**
 * Calculate badges for a routine
 */
function calculateBadges(routine: any): {
  badge_popular: boolean;
  badge_trending: boolean;
  badge_new: boolean;
  badge_official: boolean;
} {
  const now = new Date();
  const createdAt = new Date(routine.created_at);
  const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  return {
    badge_popular: routine.completion_count > 100,
    badge_trending: false, // Will be calculated separately if needed
    badge_new: daysDiff <= 7,
    badge_official: !routine.is_custom,
  };
}

/**
 * Get routines for discover feed with sorting and filtering
 */
export async function getDiscoverRoutines(
  userId: string,
  params: RoutineDiscoverParams = {}
): Promise<Routine[]> {
  try {
    // Get routines
    const query = buildDiscoverQuery(userId, params);
    const { data: routines, error } = await query;

    if (error) {
      console.error('Error fetching discover routines:', error);
      throw new Error('Failed to load discover routines');
    }

    if (!routines) {
      return [];
    }

    // Get user's saved routines to mark them
    const { data: savedRoutines } = await supabase
      .from('routine_saves')
      .select('routine_id')
      .eq('user_id', userId);

    const savedRoutineIds = new Set(
      (savedRoutines || []).map((item: any) => item.routine_id)
    );

    // For trending sort, we need to get recent saves count
    let recentSavesMap: Map<string, number> = new Map();
    if (params.sort === 'trending') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentSaves } = await supabase
        .from('routine_saves')
        .select('routine_id')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Count recent saves per routine
      (recentSaves || []).forEach((item: any) => {
        const count = recentSavesMap.get(item.routine_id) || 0;
        recentSavesMap.set(item.routine_id, count + 1);
      });
    }

    // Process and format routines
    let processedRoutines = routines.map((routine: any) => {
      const badges = calculateBadges(routine);
      const recentSaves = recentSavesMap.get(routine.id) || 0;

      return {
        id: routine.id,
        name: routine.name,
        category: routine.category,
        description: routine.description,
        duration_minutes: routine.duration_minutes,
        difficulty: routine.difficulty,
        journey_focus: routine.journey_focus,
        benefits: routine.benefits,
        exercises: routine.exercises,
        completion_count: routine.completion_count,
        is_custom: routine.is_custom,
        created_by: routine.created_by,
        created_at: routine.created_at,
        tags: routine.tags,
        body_parts: routine.body_parts,
        is_public: routine.is_public,
        save_count: routine.save_count || 0,
        is_saved: savedRoutineIds.has(routine.id),
        badge_popular: badges.badge_popular,
        badge_trending: recentSaves > 20,
        badge_new: badges.badge_new,
        badge_official: badges.badge_official,
        author_type: routine.author_type,
        official_author: routine.official_author,
        creator_name: routine.profiles?.full_name,
        creator_username: routine.profiles?.username,
        creator_avatar: routine.profiles?.profile_picture_url,
      };
    });

    // If sorting by trending, re-sort by recent saves count
    if (params.sort === 'trending') {
      processedRoutines.sort((a, b) => {
        const aRecent = recentSavesMap.get(a.id) || 0;
        const bRecent = recentSavesMap.get(b.id) || 0;
        return bRecent - aRecent;
      });
    }

    return processedRoutines;
  } catch (error) {
    console.error('Error in getDiscoverRoutines:', error);
    throw error;
  }
}

/**
 * Get user's custom routines
 */
export async function getUserCustomRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select(`
      id,
      name,
      category,
      description,
      duration_minutes,
      difficulty,
      journey_focus,
      benefits,
      exercises,
      completion_count,
      is_custom,
      created_by,
      created_at,
      tags,
      body_parts,
      is_public,
      save_count,
      author_type,
      official_author,
      profiles (
        full_name,
        username,
        profile_picture_url
      )
    `)
    .eq('created_by', userId)
    .eq('is_custom', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom routines:', error);
    throw new Error('Failed to load custom routines');
  }

  return (data || []).map((routine: any) => ({
    ...routine,
    is_saved: false, // User's own routines don't show as "saved"
    badge_popular: routine.completion_count > 100,
    badge_trending: false,
    badge_new: (new Date().getTime() - new Date(routine.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7,
    badge_official: false,
    creator_name: routine.profiles?.full_name,
    creator_username: routine.profiles?.username,
    creator_avatar: routine.profiles?.profile_picture_url,
  }));
}

/**
 * Toggle routine public/private status (for user's custom routines)
 */
export async function toggleRoutinePublicStatus(
  userId: string,
  routineId: string,
  isPublic: boolean
): Promise<void> {
  // Verify user owns the routine
  const { data: routine } = await supabase
    .from('routines')
    .select('created_by')
    .eq('id', routineId)
    .single();

  if (!routine || routine.created_by !== userId) {
    throw new Error('You can only change the visibility of your own routines');
  }

  const { error } = await supabase
    .from('routines')
    .update({ is_public: isPublic })
    .eq('id', routineId)
    .eq('created_by', userId);

  if (error) {
    throw new Error('Failed to update routine visibility');
  }
}

/**
 * Get recently completed routines for quick repeat
 */
export async function getRecentlyCompletedRoutines(
  userId: string,
  limit: number = 10
): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routine_completions')
    .select(`
      routine_id,
      completed_at,
      routines (
        id,
        name,
        category,
        description,
        duration_minutes,
        difficulty,
        journey_focus,
        benefits,
        exercises,
        completion_count,
        is_custom,
        created_by,
        created_at,
        tags,
        body_parts,
        is_public,
        save_count,
        author_type,
        official_author
      )
    `)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recently completed routines:', error);
    return [];
  }

  // Remove duplicates and extract routines
  const seenIds = new Set<string>();
  const uniqueRoutines: any[] = [];

  for (const item of data || []) {
    const routine = item.routines as any;
    if (routine && typeof routine === 'object' && !Array.isArray(routine) && routine.id) {
      if (!seenIds.has(routine.id)) {
        seenIds.add(routine.id);
        uniqueRoutines.push(routine);
      }
    }
  }

  return uniqueRoutines.map((routine: any) => ({
    ...routine,
    is_saved: false, // Will be checked separately if needed
    badge_popular: routine.completion_count > 100,
    badge_trending: false,
    badge_new: (new Date().getTime() - new Date(routine.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7,
    badge_official: !routine.is_custom,
    creator_name: routine.profiles?.full_name,
    creator_username: routine.profiles?.username,
    creator_avatar: routine.profiles?.profile_picture_url,
  }));
}
