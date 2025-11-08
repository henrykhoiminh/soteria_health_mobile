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

  // Record activity
  await recordActivity(userId, 'joined_circle', { circle_id: data.id, circle_name: name });

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

  // Record activity for the inviter
  await recordActivity(inviterId, 'invited_to_circle', {
    circle_id: circleId,
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
      circles!circle_id(id, name, description, is_private),
      inviter_profile:profiles!circle_invitations_inviter_id_fkey(*)
    `)
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching circle invitations:', error);
    throw error;
  }

  console.log('Circle invitations data:', JSON.stringify(data, null, 2));
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
    .select('circle_id, invitee_id, circles!circle_id(name)')
    .eq('id', invitationId)
    .single();

  if (invitation) {
    // Record activity for joining
    const circleName = (invitation as any).circles?.name || 'a circle';
    await recordActivity(invitation.invitee_id, 'joined_circle', {
      circle_id: invitation.circle_id,
      circle_name: circleName,
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

  // Record activity for joining the circle
  await recordActivity(userId, 'joined_circle', {
    circle_id: circleId,
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

  // Record activity for leaving the circle
  await recordActivity(userId, 'left_circle', {
    circle_id: circleId,
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

  // Record activity for the removed user
  await recordActivity(userId, 'removed_from_circle', {
    circle_id: circleId,
    circle_name: circle?.name || 'a circle',
    removed_by: removedBy,
  });

  // If removedBy is provided, also record activity for the admin who removed them
  if (removedBy && removedBy !== userId) {
    await recordActivity(removedBy, 'removed_from_circle', {
      circle_id: circleId,
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

  // Record activity
  await recordActivity(userId, 'shared_routine', {
    routine_id: routineId,
    circle_id: circleId,
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
 * Record a user activity
 * Uses a database function with SECURITY DEFINER to bypass RLS
 * This allows recording activities on behalf of other users (e.g., when inviting to circles)
 * @param userId - User ID
 * @param activityType - Type of activity
 * @param activityData - Additional data about the activity
 */
export async function recordActivity(
  userId: string,
  activityType: ActivityType,
  activityData?: Record<string, any>
): Promise<FriendActivity> {
  // Use the database function to record activity with elevated privileges
  const { data: activityId, error: rpcError } = await supabase.rpc('record_friend_activity', {
    p_user_id: userId,
    p_activity_type: activityType,
    p_related_routine_id: activityData?.routine_id || null,
    p_related_circle_id: activityData?.circle_id || null,
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
 * Get activity feed for a user (friend activities only)
 * @param userId - User ID
 * @param limit - Maximum activities to fetch
 */
export async function getFriendActivity(userId: string, limit: number = 50): Promise<FriendActivity[]> {
  // First, get all friend IDs
  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id, user_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  const friendIds = friendships?.map(f =>
    f.user_id === userId ? f.friend_id : f.user_id
  ) || [];

  if (friendIds.length === 0) {
    return [];
  }

  // Get activities from friends
  const { data, error } = await supabase
    .from('friend_activity')
    .select(`
      *,
      user_profile:profiles!friend_activity_user_id_fkey(*),
      routine:routines(*),
      circle:circles(*)
    `)
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get activity feed for a specific circle
 * @param circleId - Circle ID
 * @param limit - Maximum activities to fetch
 */
export async function getCircleActivity(circleId: string, limit: number = 50): Promise<FriendActivity[]> {
  // Get all circle member IDs
  const { data: members } = await supabase
    .from('circle_members')
    .select('user_id')
    .eq('circle_id', circleId);

  const memberIds = members?.map(m => m.user_id) || [];

  if (memberIds.length === 0) {
    return [];
  }

  // Get activities from circle members
  const { data, error } = await supabase
    .from('friend_activity')
    .select(`
      *,
      user_profile:profiles!friend_activity_user_id_fkey(*),
      routine:routines(*),
      circle:circles(*)
    `)
    .in('user_id', memberIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
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
 * Get formatted activity feed
 * @param userId - User ID
 * @param limit - Maximum activities
 */
export async function getFormattedFriendActivity(
  userId: string,
  limit: number = 50
): Promise<ActivityFeedItem[]> {
  const activities = await getFriendActivity(userId, limit);
  return activities.map(formatActivityFeedItem);
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
