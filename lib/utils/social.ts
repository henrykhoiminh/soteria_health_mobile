import { supabase } from '../supabase/client';
import {
  Friendship,
  FriendWithProfile,
  FriendRequest,
  Circle,
  CircleMember,
  CircleWithMembers,
  CircleRoutine,
  FriendActivity,
  ActivityType,
  ActivityFeedItem,
  UserSearchResult,
  Profile,
} from '@/types';

// =====================================================
// FRIENDSHIP FUNCTIONS
// =====================================================

/**
 * Send a friend request to another user
 * @param userId - Current user's ID
 * @param friendId - Target user's ID
 */
export async function sendFriendRequest(userId: string, friendId: string): Promise<Friendship> {
  // Check if friendship already exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .maybeSingle();

  if (existing) {
    throw new Error('Friendship request already exists');
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Accept a friend request
 * @param friendshipId - Friendship record ID
 */
export async function acceptFriendRequest(friendshipId: string): Promise<Friendship> {
  const { data, error } = await supabase
    .from('friendships')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', friendshipId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Decline or delete a friend request
 * @param friendshipId - Friendship record ID
 */
export async function declineFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) throw error;
}

/**
 * Block a user
 * @param userId - Current user's ID
 * @param friendId - User to block
 */
export async function blockUser(userId: string, friendId: string): Promise<void> {
  // First, find and delete any existing friendship
  await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

  // Create blocked relationship
  const { error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'blocked',
    });

  if (error) throw error;
}

/**
 * Unfriend a user
 * @param friendshipId - Friendship record ID
 */
export async function unfriend(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) throw error;
}

/**
 * Get all friends for a user (accepted friendships only)
 * @param userId - User ID
 */
export async function getFriends(userId: string): Promise<FriendWithProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      friend_profile:profiles!friendships_friend_id_fkey(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false });

  if (error) throw error;

  // Also get friendships where current user is the friend_id
  const { data: reverseFriends, error: reverseError } = await supabase
    .from('friendships')
    .select(`
      *,
      friend_profile:profiles!friendships_user_id_fkey(*)
    `)
    .eq('friend_id', userId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false });

  if (reverseError) throw reverseError;

  // Normalize the data so friend_id always points to the OTHER person
  const normalizedData = (data || []).map(item => item);

  const normalizedReverseFriends = (reverseFriends || []).map(item => ({
    ...item,
    friend_id: item.user_id, // The friend is the user_id when current user is friend_id
  }));

  return [...normalizedData, ...normalizedReverseFriends];
}

/**
 * Get pending friend requests (incoming)
 * @param userId - User ID
 */
export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      requester_profile:profiles!friendships_user_id_fkey(*)
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get sent friend requests (outgoing)
 * @param userId - User ID
 */
export async function getSentFriendRequests(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Search for users by name or username
 * Uses the database function that searches both fields and returns ranked results
 * @param searchTerm - Search query
 * @param currentUserId - Current user's ID (to exclude from results)
 * @param limit - Maximum results
 */
export async function searchUsers(
  searchTerm: string,
  currentUserId: string,
  limit: number = 20
): Promise<UserSearchResult[]> {
  // Use the new database function that searches both username and full_name
  const { data, error } = await supabase.rpc('search_profiles', {
    p_search_term: searchTerm,
    p_exclude_user_id: currentUserId,
    p_limit: limit,
  });

  if (error) throw error;

  // Get friendship status for each user
  const userIds = data?.map((u: any) => u.id) || [];

  if (userIds.length === 0) {
    return [];
  }

  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id, status')
    .eq('user_id', currentUserId)
    .in('friend_id', userIds);

  const friendshipMap = new Map(
    friendships?.map(f => [f.friend_id, f.status]) || []
  );

  return data?.map((user: any) => ({
    ...user,
    friendship_status: friendshipMap.get(user.id) || null,
  })) || [];
}

// =====================================================
// CIRCLE FUNCTIONS
// =====================================================

/**
 * Create a new circle
 * @param userId - Creator's user ID
 * @param name - Circle name
 * @param description - Circle description
 * @param isPrivate - Whether circle is private
 */
export async function createCircle(
  userId: string,
  name: string,
  description: string,
  isPrivate: boolean = true
): Promise<Circle> {
  const { data, error } = await supabase
    .from('circles')
    .insert({
      name,
      description,
      created_by: userId,
      is_private: isPrivate,
    })
    .select()
    .single();

  if (error) throw error;

  // Record circle activity - user created and joined the circle
  await recordCircleActivity(data.id, userId, 'joined_circle', { circle_name: name });

  return data;
}

/**
 * Get circles for a user (created or member)
 * @param userId - User ID
 */
export async function getUserCircles(userId: string): Promise<Circle[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select(`
      circle_id,
      circles (
        *,
        creator_profile:profiles!circles_created_by_fkey(*)
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw error;

  return data?.map(item => item.circles).flat() || [];
}

/**
 * Get public circles (for discovery)
 * @param limit - Maximum results
 */
export async function getPublicCircles(limit: number = 20): Promise<Circle[]> {
  const { data, error } = await supabase
    .from('circles')
    .select(`
      *,
      creator_profile:profiles!circles_created_by_fkey(*)
    `)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get circle details with members
 * @param circleId - Circle ID
 */
export async function getCircleDetails(circleId: string): Promise<CircleWithMembers> {
  const { data: circle, error: circleError } = await supabase
    .from('circles')
    .select(`
      *,
      creator_profile:profiles!circles_created_by_fkey(*)
    `)
    .eq('id', circleId)
    .single();

  if (circleError) throw circleError;

  const { data: members, error: membersError } = await supabase
    .from('circle_members')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('circle_id', circleId)
    .order('joined_at', { ascending: true });

  if (membersError) throw membersError;

  return {
    ...circle,
    members: members || [],
  };
}

/**
 * Invite a user to a circle (creates pending invitation)
 * @param circleId - Circle ID
 * @param inviteeId - User ID to invite
 * @param inviterId - ID of user sending the invite
 */
export async function inviteToCircle(
  circleId: string,
  inviteeId: string,
  inviterId: string
): Promise<void> {
  // Create pending invitation
  const { error } = await supabase
    .from('circle_invitations')
    .insert({
      circle_id: circleId,
      inviter_id: inviterId,
      invitee_id: inviteeId,
      status: 'pending',
    });

  if (error) {
    // If duplicate, might be a previous declined invitation
    if (error.code === '23505') {
      // Update the existing invitation back to pending
      const { error: updateError } = await supabase
        .from('circle_invitations')
        .update({ status: 'pending', created_at: new Date().toISOString(), responded_at: null })
        .eq('circle_id', circleId)
        .eq('invitee_id', inviteeId);

      if (updateError) throw updateError;
    } else {
      throw error;
    }
  }

  // Get circle name for activity
  const { data: circle } = await supabase
    .from('circles')
    .select('name')
    .eq('id', circleId)
    .single();

  // Record circle activity for the inviter
  await recordCircleActivity(circleId, inviterId, 'invited_to_circle', {
    circle_name: circle?.name || 'a circle',
    invited_user_id: inviteeId,
  });
}

/**
 * Get pending circle invitations for a user
 * @param userId - User ID
 */
export async function getPendingCircleInvitations(userId: string) {
  const { data, error } = await supabase
    .from('circle_invitations')
    .select(`
      *,
      inviter_profile:profiles!circle_invitations_inviter_id_fkey(*)
    `)
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Note: circles data will be null due to RLS restrictions
  // This is expected - circle names will show as "Unknown Circle"
  return data || [];
}

/**
 * Get pending invitations for a specific circle
 * @param circleId - Circle ID
 */
export async function getPendingCircleInvitationsByCircle(circleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('circle_invitations')
    .select('invitee_id')
    .eq('circle_id', circleId)
    .eq('status', 'pending');

  if (error) throw error;
  return data?.map(inv => inv.invitee_id) || [];
}

/**
 * Accept a circle invitation
 * @param invitationId - Invitation ID
 */
export async function acceptCircleInvitation(invitationId: string): Promise<void> {
  // Call the database function to accept invitation
  const { error } = await supabase.rpc('accept_circle_invitation', {
    p_invitation_id: invitationId,
  });

  if (error) throw error;

  // Get invitation details for activity logging
  const { data: invitation } = await supabase
    .from('circle_invitations')
    .select('circle_id, invitee_id')
    .eq('id', invitationId)
    .single();

  if (invitation) {
    // Record circle activity for joining
    await recordCircleActivity(invitation.circle_id, invitation.invitee_id, 'joined_circle', {
      circle_name: 'a circle',
    });
  }
}

/**
 * Decline a circle invitation
 * @param invitationId - Invitation ID
 */
export async function declineCircleInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc('decline_circle_invitation', {
    p_invitation_id: invitationId,
  });

  if (error) throw error;
}

/**
 * Join a public circle
 * @param circleId - Circle ID
 * @param userId - User ID
 */
export async function joinCircle(circleId: string, userId: string): Promise<CircleMember> {
  // Verify circle is public and get circle name
  const { data: circle } = await supabase
    .from('circles')
    .select('is_private, name')
    .eq('id', circleId)
    .single();

  if (circle?.is_private) {
    throw new Error('Cannot join a private circle');
  }

  const { data, error } = await supabase
    .from('circle_members')
    .insert({
      circle_id: circleId,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single();

  if (error) throw error;

  // Record circle activity for joining
  await recordCircleActivity(circleId, userId, 'joined_circle', {
    circle_name: circle?.name || 'a circle',
  });

  return data;
}

/**
 * Leave a circle
 * @param circleId - Circle ID
 * @param userId - User ID
 */
export async function leaveCircle(circleId: string, userId: string): Promise<void> {
  // Get circle name before deleting membership
  const { data: circle } = await supabase
    .from('circles')
    .select('name')
    .eq('id', circleId)
    .single();

  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', userId);

  if (error) throw error;

  // Record circle activity for leaving
  await recordCircleActivity(circleId, userId, 'left_circle', {
    circle_name: circle?.name || 'a circle',
  });
}

/**
 * Remove a member from a circle (admin only)
 * @param circleId - Circle ID
 * @param userId - User ID to remove
 * @param removedBy - ID of admin removing the user (optional)
 */
export async function removeMemberFromCircle(
  circleId: string,
  userId: string,
  removedBy?: string
): Promise<void> {
  // Get circle name before removing membership
  const { data: circle } = await supabase
    .from('circles')
    .select('name')
    .eq('id', circleId)
    .single();

  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', userId);

  if (error) throw error;

  // Record circle activity for the removed user
  await recordCircleActivity(circleId, userId, 'removed_from_circle', {
    circle_name: circle?.name || 'a circle',
    removed_by: removedBy,
  });

  // If removedBy is provided, also record circle activity for the admin who removed them
  if (removedBy && removedBy !== userId) {
    await recordCircleActivity(circleId, removedBy, 'removed_from_circle', {
      circle_name: circle?.name || 'a circle',
      removed_user_id: userId,
    });
  }
}

/**
 * Update circle details
 * @param circleId - Circle ID
 * @param updates - Fields to update
 */
export async function updateCircle(
  circleId: string,
  updates: { name?: string; description?: string; is_private?: boolean }
): Promise<Circle> {
  const { data, error } = await supabase
    .from('circles')
    .update(updates)
    .eq('id', circleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a circle (creator only)
 * @param circleId - Circle ID
 */
export async function deleteCircle(circleId: string): Promise<void> {
  const { error } = await supabase
    .from('circles')
    .delete()
    .eq('id', circleId);

  if (error) throw error;
}

/**
 * Get circle members
 * @param circleId - Circle ID
 */
export async function getCircleMembers(circleId: string): Promise<CircleMember[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('circle_id', circleId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// =====================================================
// CIRCLE ROUTINE SHARING FUNCTIONS
// =====================================================

/**
 * Share a routine to a circle
 * @param circleId - Circle ID
 * @param routineId - Routine ID
 * @param userId - User sharing the routine
 */
export async function shareRoutineToCircle(
  circleId: string,
  routineId: string,
  userId: string
): Promise<CircleRoutine> {
  const { data, error } = await supabase
    .from('circle_routines')
    .insert({
      circle_id: circleId,
      routine_id: routineId,
      shared_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Record circle activity for sharing routine
  await recordCircleActivity(circleId, userId, 'shared_routine', {
    routine_id: routineId,
  });

  return data;
}

/**
 * Get routines shared in a circle
 * @param circleId - Circle ID
 */
export async function getCircleRoutines(circleId: string): Promise<CircleRoutine[]> {
  const { data, error } = await supabase
    .from('circle_routines')
    .select(`
      *,
      routine:routines(*),
      sharer_profile:profiles!circle_routines_shared_by_fkey(*)
    `)
    .eq('circle_id', circleId)
    .order('shared_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Remove a routine from a circle
 * @param circleRoutineId - Circle routine record ID
 */
export async function removeRoutineFromCircle(circleRoutineId: string): Promise<void> {
  const { error } = await supabase
    .from('circle_routines')
    .delete()
    .eq('id', circleRoutineId);

  if (error) throw error;
}

// =====================================================
// ACTIVITY FEED FUNCTIONS
// =====================================================

/**
 * Record a GLOBAL user activity (not associated with any circle)
 * Examples: completed routine (outside circles), created custom routine, streak milestone, joined Soteria
 * @param userId - User ID
 * @param activityType - Type of activity
 * @param activityData - Additional data about the activity
 */
export async function recordUserActivity(
  userId: string,
  activityType: ActivityType,
  activityData?: Record<string, any>
): Promise<FriendActivity> {
  // Use the database function to record activity with elevated privileges
  // related_circle_id is explicitly NULL for global activities
  const { data: activityId, error: rpcError } = await supabase.rpc('record_friend_activity', {
    p_user_id: userId,
    p_activity_type: activityType,
    p_related_routine_id: activityData?.routine_id || null,
    p_related_circle_id: null, // GLOBAL activity - no circle association
    p_activity_data: activityData || null,
  });

  if (rpcError) throw rpcError;

  // Fetch the created activity to return
  const { data, error } = await supabase
    .from('friend_activity')
    .select('*')
    .eq('id', activityId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Record a CIRCLE-SPECIFIC activity
 * Examples: shared routine to circle, joined circle, left circle, member joined
 * @param circleId - Circle ID where the activity occurred
 * @param userId - User ID who performed the activity
 * @param activityType - Type of activity
 * @param activityData - Additional data about the activity
 */
export async function recordCircleActivity(
  circleId: string,
  userId: string,
  activityType: ActivityType,
  activityData?: Record<string, any>
): Promise<FriendActivity> {
  // Use the database function to record activity with elevated privileges
  // related_circle_id is set to the circleId
  const { data: activityId, error: rpcError } = await supabase.rpc('record_friend_activity', {
    p_user_id: userId,
    p_activity_type: activityType,
    p_related_routine_id: activityData?.routine_id || null,
    p_related_circle_id: circleId, // CIRCLE-SPECIFIC activity
    p_activity_data: activityData || null,
  });

  if (rpcError) throw rpcError;

  // Fetch the created activity to return
  const { data, error } = await supabase
    .from('friend_activity')
    .select('*')
    .eq('id', activityId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * DEPRECATED: Use recordUserActivity() for global activities or recordCircleActivity() for circle activities
 * This function is kept for backward compatibility
 */
export async function recordActivity(
  userId: string,
  activityType: ActivityType,
  activityData?: Record<string, any>
): Promise<FriendActivity> {
  // If circle_id is in activityData, use recordCircleActivity
  if (activityData?.circle_id) {
    return recordCircleActivity(activityData.circle_id, userId, activityType, activityData);
  }
  // Otherwise, use recordUserActivity
  return recordUserActivity(userId, activityType, activityData);
}

/**
 * Get GLOBAL activity feed for a user (for Social tab)
 * Returns:
 * 1. User's own global activities (not associated with any circle)
 * 2. Friends' global activities
 * 3. Activities from circles user is a member of
 * @param userId - User ID
 * @param limit - Maximum activities to fetch
 * @param offset - Offset for pagination
 */
export async function getGlobalActivityFeed(userId: string, limit: number = 50, offset: number = 0): Promise<FriendActivity[]> {
  // Get all friend IDs
  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id, user_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  const friendIds = friendships?.map(f =>
    f.user_id === userId ? f.friend_id : f.user_id
  ) || [];

  // Get all circle IDs user is member of
  const { data: circleMembers } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', userId);

  const userCircleIds = circleMembers?.map(cm => cm.circle_id) || [];

  // Build the query for global activities
  // Include: user's own activities + friends' activities (where circle_id IS NULL)
  // PLUS activities from circles user is member of (where circle_id IN user's circles)

  const userAndFriendIds = [userId, ...friendIds];

  // Query 1: Global activities (no circle association) from user and friends
  const globalQuery = supabase
    .from('friend_activity')
    .select(`
      *,
      user_profile:profiles!friend_activity_user_id_fkey(*),
      routine:routines(*),
      circle:circles(*)
    `)
    .in('user_id', userAndFriendIds)
    .is('related_circle_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Query 2: Circle activities from circles user is member of (if any)
  let circleQuery = null;
  if (userCircleIds.length > 0) {
    circleQuery = supabase
      .from('friend_activity')
      .select(`
        *,
        user_profile:profiles!friend_activity_user_id_fkey(*),
        routine:routines(*),
        circle:circles(*)
      `)
      .in('related_circle_id', userCircleIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
  }

  // Execute queries in parallel
  const queries = [globalQuery];
  if (circleQuery) queries.push(circleQuery);

  const results = await Promise.all(queries);

  // Combine and sort by created_at
  const allActivities: FriendActivity[] = [];
  results.forEach(result => {
    if (result.data) {
      allActivities.push(...result.data);
    }
  });

  // Sort combined activities by created_at descending
  allActivities.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Limit to requested number
  return allActivities.slice(0, limit);
}

/**
 * DEPRECATED: Use getGlobalActivityFeed() instead
 * This function is kept for backward compatibility
 */
export async function getFriendActivity(userId: string, limit: number = 50): Promise<FriendActivity[]> {
  return getGlobalActivityFeed(userId, limit, 0);
}

/**
 * Get activity feed for a specific circle (ONLY circle-specific activities)
 * Returns activities where related_circle_id = circleId
 * @param circleId - Circle ID
 * @param limit - Maximum activities to fetch
 * @param offset - Offset for pagination
 */
export async function getCircleActivity(circleId: string, limit: number = 50, offset: number = 0): Promise<FriendActivity[]> {
  // Get activities specifically associated with this circle
  const { data, error } = await supabase
    .from('friend_activity')
    .select(`
      *,
      user_profile:profiles!friend_activity_user_id_fkey(*),
      routine:routines(*),
      circle:circles(*)
    `)
    .eq('related_circle_id', circleId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

/**
 * Helper function to get all circle IDs user is a member of
 * @param userId - User ID
 */
export async function getUserCircleIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', userId);

  if (error) throw error;
  return data?.map(cm => cm.circle_id) || [];
}

/**
 * Format activity for display in feed
 * @param activity - Raw activity data
 */
export function formatActivityFeedItem(activity: FriendActivity): ActivityFeedItem {
  const user = activity.user_profile!;
  let message = '';

  switch (activity.activity_type) {
    case 'completed_routine':
      const streak = activity.activity_data?.streak || 1;
      message = `completed ${activity.routine?.name || 'a routine'}`;
      if (streak > 1) {
        message += ` - ${streak} day streak!`;
      }
      break;
    case 'created_routine':
      message = `created a new routine: ${activity.routine?.name || 'Untitled'}`;
      break;
    case 'streak_milestone':
      const milestone = activity.activity_data?.milestone || 0;
      message = `reached a ${milestone} day streak milestone!`;
      break;
    case 'joined_circle':
      message = `joined ${activity.circle?.name || 'a circle'}`;
      break;
    case 'left_circle':
      message = `left ${activity.circle?.name || 'a circle'}`;
      break;
    case 'invited_to_circle':
      message = `invited a friend to ${activity.circle?.name || 'a circle'}`;
      break;
    case 'removed_from_circle':
      // Check if this is the person who was removed or the person who did the removing
      if (activity.activity_data?.removed_user_id) {
        message = `removed a member from ${activity.circle?.name || 'a circle'}`;
      } else {
        message = `was removed from ${activity.circle?.name || 'a circle'}`;
      }
      break;
    case 'shared_routine':
      message = `shared ${activity.routine?.name || 'a routine'} to ${activity.circle?.name || 'a circle'}`;
      break;
    case 'completed_circle_routine':
      message = `completed ${activity.routine?.name || 'a routine'} in ${activity.circle?.name || 'a circle'}`;
      break;
    case 'added_routine_to_circle':
      message = `added ${activity.routine?.name || 'a routine'} to ${activity.circle?.name || 'a circle'}`;
      break;
    case 'routine_became_popular':
      message = `${activity.routine?.name || 'A routine'} became popular in ${activity.circle?.name || 'a circle'}! 🔥`;
      break;
  }

  return {
    id: activity.id,
    user,
    activityType: activity.activity_type,
    message,
    timestamp: activity.created_at,
    routineId: activity.related_routine_id || undefined,
    routineName: activity.routine?.name || undefined,
    circleId: activity.related_circle_id || undefined,
    circleName: activity.circle?.name || undefined,
    metadata: activity.activity_data || undefined,
  };
}

/**
 * Get formatted GLOBAL activity feed (for Social tab)
 * @param userId - User ID
 * @param limit - Maximum activities
 * @param offset - Offset for pagination
 */
export async function getFormattedGlobalActivity(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityFeedItem[]> {
  const activities = await getGlobalActivityFeed(userId, limit, offset);
  return activities.map(formatActivityFeedItem);
}

/**
 * Get formatted circle activity feed
 * @param circleId - Circle ID
 * @param limit - Maximum activities
 * @param offset - Offset for pagination
 */
export async function getFormattedCircleActivity(
  circleId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityFeedItem[]> {
  const activities = await getCircleActivity(circleId, limit, offset);
  return activities.map(formatActivityFeedItem);
}

/**
 * DEPRECATED: Use getFormattedGlobalActivity() instead
 * This function is kept for backward compatibility
 */
export async function getFormattedFriendActivity(
  userId: string,
  limit: number = 50
): Promise<ActivityFeedItem[]> {
  return getFormattedGlobalActivity(userId, limit, 0);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if two users are friends
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const { data } = await supabase
    .from('friendships')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(user_id.eq.${userId1},friend_id.eq.${userId2}),and(user_id.eq.${userId2},friend_id.eq.${userId1})`)
    .maybeSingle();

  return !!data;
}

/**
 * Get friend count for a user
 * @param userId - User ID
 */
export async function getFriendCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error) throw error;
  return count || 0;
}

/**
 * Check if user is a member of a circle
 * @param circleId - Circle ID
 * @param userId - User ID
 */
export async function isCircleMember(circleId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('circle_members')
    .select('id')
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * Get user's role in a circle
 * @param circleId - Circle ID
 * @param userId - User ID
 */
export async function getUserCircleRole(circleId: string, userId: string): Promise<'admin' | 'member' | null> {
  const { data } = await supabase
    .from('circle_members')
    .select('role')
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.role || null;
}

// =====================================================
// CIRCLE ROUTINES MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Add a routine to a circle
 * @param circleId - Circle ID
 * @param routineId - Routine ID
 * @param userId - User adding the routine
 */
export async function addRoutineToCircle(
  circleId: string,
  routineId: string,
  userId: string
): Promise<CircleRoutine> {
  // Check if routine already exists in circle
  const { data: existing } = await supabase
    .from('circle_routines')
    .select('id')
    .eq('circle_id', circleId)
    .eq('routine_id', routineId)
    .maybeSingle();

  if (existing) {
    throw new Error('This routine is already in the circle');
  }

  const { data, error } = await supabase
    .from('circle_routines')
    .insert({
      circle_id: circleId,
      routine_id: routineId,
      shared_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Record circle activity for adding routine
  await recordCircleActivity(circleId, userId, 'added_routine_to_circle', {
    routine_id: routineId,
  });

  return data;
}

/**
 * Get all routines in a circle with stats
 * @param circleId - Circle ID
 */
export async function getCircleRoutinesWithStats(circleId: string) {
  const { data, error } = await supabase
    .from('circle_routine_stats')
    .select('*')
    .eq('circle_id', circleId)
    .order('shared_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Complete a circle routine
 * Users can complete the same routine multiple times (no daily limit)
 * Stats will show unique members who completed, not total completions
 * @param circleId - Circle ID
 * @param routineId - Routine ID
 * @param userId - User ID
 * @param durationSeconds - How long it took (optional)
 * @param notes - Completion notes (optional)
 */
export async function completeCircleRoutine(
  circleId: string,
  routineId: string,
  userId: string,
  durationSeconds?: number,
  notes?: string
): Promise<void> {
  // Get stats BEFORE completion to detect if this is the completion that makes it popular
  const statsBefore = await getCircleRoutineStats(circleId, routineId);

  // Record the completion (no limit - users can complete multiple times)
  const { error } = await supabase
    .from('circle_routine_completions')
    .insert({
      circle_id: circleId,
      routine_id: routineId,
      user_id: userId,
      duration_seconds: durationSeconds,
      notes: notes,
    });

  if (error) throw error;

  // Record circle activity for completing the routine
  await recordCircleActivity(circleId, userId, 'completed_circle_routine', {
    routine_id: routineId,
  });

  // Check if routine just became popular (50% threshold just crossed)
  const statsAfter = await getCircleRoutineStats(circleId, routineId);
  if (statsAfter && statsAfter.is_popular && !statsBefore?.is_popular) {
    // Just became popular! Log celebratory activity
    await recordCircleActivity(circleId, userId, 'routine_became_popular', {
      routine_id: routineId,
    });
  }
}

/**
 * Get stats for a specific circle routine
 * @param circleId - Circle ID
 * @param routineId - Routine ID
 */
export async function getCircleRoutineStats(circleId: string, routineId: string) {
  const { data, error } = await supabase
    .from('circle_routine_stats')
    .select('*')
    .eq('circle_id', circleId)
    .eq('routine_id', routineId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Check if user has completed a circle routine today (at least once)
 * Note: This does NOT prevent multiple completions - users can complete unlimited times
 * This is only for UI display purposes (e.g., showing a checkmark indicator)
 * @param circleId - Circle ID
 * @param routineId - Routine ID
 * @param userId - User ID
 */
export async function hasCompletedCircleRoutineToday(
  circleId: string,
  routineId: string,
  userId: string
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('circle_routine_completions')
    .select('id')
    .eq('circle_id', circleId)
    .eq('routine_id', routineId)
    .eq('user_id', userId)
    .gte('completed_at', `${today}T00:00:00`)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Get user's completion history for circle routines
 * @param circleId - Circle ID
 * @param userId - User ID
 */
export async function getUserCircleRoutineCompletions(
  circleId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('circle_routine_completions')
    .select(`
      *,
      routine:routines(*)
    `)
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all routines NOT yet in a circle (for adding)
 * @param circleId - Circle ID
 */
export async function getAvailableRoutinesForCircle(circleId: string) {
  // Get all routine IDs already in the circle
  const { data: circleRoutines } = await supabase
    .from('circle_routines')
    .select('routine_id')
    .eq('circle_id', circleId);

  const existingIds = circleRoutines?.map(cr => cr.routine_id) || [];

  // Get all routines NOT in the existing IDs
  const query = supabase
    .from('routines')
    .select('*')
    .order('name', { ascending: true });

  if (existingIds.length > 0) {
    query.not('id', 'in', `(${existingIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Search and filter circle routines
 * @param circleId - Circle ID
 * @param searchQuery - Search term (optional)
 * @param category - Filter by category (optional)
 * @param sortBy - Sort method: 'popular', 'recent', 'name'
 */
export async function searchCircleRoutines(
  circleId: string,
  searchQuery?: string,
  category?: string,
  sortBy: 'popular' | 'recent' | 'name' = 'recent'
) {
  let query = supabase
    .from('circle_routine_stats')
    .select('*')
    .eq('circle_id', circleId);

  // Apply search filter
  if (searchQuery && searchQuery.trim()) {
    query = query.or(`routine_name.ilike.%${searchQuery}%,routine_description.ilike.%${searchQuery}%`);
  }

  // Apply category filter
  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  // Apply sorting
  switch (sortBy) {
    case 'popular':
      query = query.order('completion_count', { ascending: false });
      break;
    case 'name':
      query = query.order('routine_name', { ascending: true });
      break;
    case 'recent':
    default:
      query = query.order('shared_at', { ascending: false });
      break;
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
