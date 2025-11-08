import { supabase } from '../supabase/client';

/**
 * Username validation rules:
 * - 3-20 characters
 * - Must start with a letter
 * - Only lowercase letters, numbers, underscores, or periods
 * - Cannot end with underscore or period
 * - No consecutive periods or underscores
 */

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUsernameFormat(username: string): UsernameValidationResult {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 20) {
    return { isValid: false, error: 'Username must be 20 characters or less' };
  }

  if (!/^[a-zA-Z]/.test(username)) {
    return { isValid: false, error: 'Username must start with a letter' };
  }

  if (!/^[a-z0-9_.]+$/.test(username.toLowerCase())) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and periods' };
  }

  if (/[_.]$/.test(username)) {
    return { isValid: false, error: 'Username cannot end with underscore or period' };
  }

  if (/\.\./.test(username) || /__/.test(username)) {
    return { isValid: false, error: 'Username cannot have consecutive periods or underscores' };
  }

  return { isValid: true };
}

export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string
): Promise<{ isAvailable: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('is_username_available', {
      p_username: username,
      p_exclude_user_id: excludeUserId || null,
    });

    if (error) throw error;

    return {
      isAvailable: data as boolean,
      error: data ? undefined : 'Username is already taken',
    };
  } catch (error) {
    console.error('Error checking username availability:', error);
    return { isAvailable: false, error: 'Failed to check username availability' };
  }
}

export async function validateUsername(
  username: string,
  excludeUserId?: string
): Promise<UsernameValidationResult> {
  // First validate format
  const formatValidation = validateUsernameFormat(username);
  if (!formatValidation.isValid) {
    return formatValidation;
  }

  // Then check availability
  const availability = await checkUsernameAvailability(username, excludeUserId);
  if (!availability.isAvailable) {
    return { isValid: false, error: availability.error };
  }

  return { isValid: true };
}

export async function getSuggestedUsernames(fullName: string, limit: number = 5): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('suggest_usernames', {
      p_full_name: fullName,
      p_limit: limit,
    });

    if (error) throw error;

    return (data || []).map((row: { suggestion: string }) => row.suggestion);
  } catch (error) {
    console.error('Error getting username suggestions:', error);
    // Fallback: generate simple suggestions
    const base = fullName
      .toLowerCase()
      .split(' ')[0]
      .replace(/[^a-z0-9]/g, '');
    const suggestions = [];
    for (let i = 1; i <= limit; i++) {
      suggestions.push(i === 1 ? base : `${base}${i}`);
    }
    return suggestions;
  }
}

export function formatUsername(username: string): string {
  return `@${username}`;
}

export function getDisplayName(profile: { full_name: string | null; username: string | null }): string {
  if (profile.username) {
    return formatUsername(profile.username);
  }
  return profile.full_name || 'Unknown User';
}

export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}
