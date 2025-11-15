import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '@/types';
import { AppColors } from '@/constants/theme';

interface UserRoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium' | 'large';
}

/**
 * UserRoleBadge
 *
 * Displays a badge indicating the user's role:
 * - Health Team: Special badge for Soteria wellness creators
 * - Admin: Badge for administrators
 * - User: No badge shown (default role)
 */
export default function UserRoleBadge({ role, size = 'medium' }: UserRoleBadgeProps) {
  // Don't show badge for regular users
  if (role === 'user') {
    return null;
  }

  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const isLarge = size === 'large';

  const iconSize = isSmall ? 14 : isMedium ? 16 : 18;
  const fontSize = isSmall ? 11 : isMedium ? 13 : 15;

  if (role === 'health_team') {
    return (
      <View style={[styles.badge, styles.healthTeamBadge]}>
        <Ionicons name="shield-checkmark" size={iconSize} color="#FFFFFF" />
        <Text style={[styles.badgeText, { fontSize }]}>Soteria Health Team</Text>
      </View>
    );
  }

  if (role === 'admin') {
    return (
      <View style={[styles.badge, styles.adminBadge]}>
        <Ionicons name="star" size={iconSize} color="#FFFFFF" />
        <Text style={[styles.badgeText, { fontSize }]}>Admin</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthTeamBadge: {
    backgroundColor: '#10B981',
  },
  adminBadge: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
