import { supabase } from '@/lib/supabase/client';
import { HealthTeamInvitation, HealthTeamStats } from '@/types';

/**
 * Send a health_team invitation to a user
 */
export async function sendHealthTeamInvitation(
  inviteeId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('send_health_team_invitation', {
    p_invitee_id: inviteeId,
  });

  if (error) {
    console.error('Error sending health team invitation:', error);
    throw new Error(error.message || 'Failed to send invitation');
  }

  return data as string; // Returns invitation ID
}

/**
 * Accept a health_team invitation
 */
export async function acceptHealthTeamInvitation(
  invitationId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('accept_health_team_invitation', {
    p_invitation_id: invitationId,
  });

  if (error) {
    console.error('Error accepting health team invitation:', error);
    throw new Error(error.message || 'Failed to accept invitation');
  }

  return data as boolean;
}

/**
 * Decline a health_team invitation
 */
export async function declineHealthTeamInvitation(
  invitationId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('decline_health_team_invitation', {
    p_invitation_id: invitationId,
  });

  if (error) {
    console.error('Error declining health team invitation:', error);
    throw new Error(error.message || 'Failed to decline invitation');
  }

  return data as boolean;
}

/**
 * Get pending health_team invitations for current user
 */
export async function getMyPendingHealthTeamInvitations(): Promise<
  HealthTeamInvitation[]
> {
  const { data, error } = await supabase.rpc(
    'get_my_pending_health_team_invitations'
  );

  if (error) {
    console.error('Error fetching health team invitations:', error);
    throw new Error(error.message || 'Failed to fetch invitations');
  }

  return (data || []).map((inv: any) => ({
    id: inv.id,
    inviter_id: inv.inviter_id,
    invitee_id: '', // Not needed from this query
    status: 'pending' as const,
    created_at: inv.created_at,
    responded_at: null,
    inviter_name: inv.inviter_name,
    inviter_username: inv.inviter_username,
    inviter_avatar: inv.inviter_avatar,
  }));
}

/**
 * Get health_team stats for a user (official routines created, completions, etc.)
 */
export async function getHealthTeamStats(
  userId: string
): Promise<HealthTeamStats> {
  const { data, error } = await supabase.rpc('get_health_team_stats', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching health team stats:', error);
    throw new Error(error.message || 'Failed to fetch health team stats');
  }

  // The function returns a single row as an array
  const stats = data && data.length > 0 ? data[0] : null;

  return {
    official_routines_created: stats?.official_routines_created || 0,
    total_official_completions: stats?.total_official_completions || 0,
    official_routines_saved: stats?.official_routines_saved || 0,
  };
}

/**
 * Check if there's a pending invitation for a user
 */
export async function hasPendingInvitation(
  inviteeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('health_team_invitations')
    .select('id')
    .eq('invitee_id', inviteeId)
    .eq('status', 'pending')
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error checking for pending invitation:', error);
  }

  return !!data;
}

/**
 * Cancel a pending invitation (for inviter)
 */
export async function cancelHealthTeamInvitation(
  invitationId: string
): Promise<void> {
  const { error } = await supabase
    .from('health_team_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    console.error('Error canceling invitation:', error);
    throw new Error(error.message || 'Failed to cancel invitation');
  }
}

/**
 * Get all health_team members (for admins)
 */
export async function getAllHealthTeamMembers(): Promise<any[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, profile_picture_url, role, created_at')
    .in('role', ['health_team', 'admin'])
    .order('full_name');

  if (error) {
    console.error('Error fetching health team members:', error);
    throw new Error(error.message || 'Failed to fetch health team members');
  }

  return data || [];
}

/**
 * Leave health team (demote to regular user)
 * Can demote yourself or (if admin) demote others
 */
export async function leaveHealthTeam(userId?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('leave_health_team', {
    p_user_id: userId || null,
  });

  if (error) {
    console.error('Error leaving health team:', error);
    throw new Error(error.message || 'Failed to leave health team');
  }

  return data as boolean;
}
