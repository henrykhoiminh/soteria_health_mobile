import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoutineAuthorType } from '@/types';
import { AppColors } from '@/constants/theme';

// Soteria logo for official routines
const SOTERIA_LOGO = require('@/assets/images/soteria-logo.png');

interface RoutineAuthorBadgeProps {
  authorType: RoutineAuthorType;
  officialAuthor?: string | null;
  creatorUsername?: string;
  creatorAvatar?: string;
  creatorName?: string;
  size?: 'small' | 'medium' | 'large';
  showAvatar?: boolean;
}

/**
 * RoutineAuthorBadge
 *
 * Displays author attribution for routines:
 * - Official routines: Shows Soteria logo + "@soteriahealthteam"
 * - Community routines: Shows "@username" with optional profile picture
 *
 * Adapts to different sizes for various contexts (cards, detail pages, etc.)
 */
export default function RoutineAuthorBadge({
  authorType,
  officialAuthor,
  creatorUsername,
  creatorAvatar,
  creatorName,
  size = 'medium',
  showAvatar = true,
}: RoutineAuthorBadgeProps) {

  const styles = getStyles(size);

  if (authorType === 'official') {
    return (
      <View style={styles.container}>
        <View style={styles.authorBadge}>
          {showAvatar && (
            <Image
              source={SOTERIA_LOGO}
              style={styles.avatar}
            />
          )}
          <Text style={styles.usernameText}>
            @soteriahealthteam
          </Text>
        </View>
      </View>
    );
  }

  // Community routine
  // Use username if available, otherwise use creator name, otherwise fallback to 'community'
  const displayName = creatorUsername || creatorName || 'community';

  return (
    <View style={styles.container}>
      <View style={styles.authorBadge}>
        {showAvatar && creatorAvatar ? (
          <Image
            source={{ uri: creatorAvatar }}
            style={styles.avatar}
          />
        ) : showAvatar ? (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={size === 'small' ? 12 : size === 'medium' ? 14 : 16} color={AppColors.textSecondary} />
          </View>
        ) : null}

        <Text style={styles.usernameText}>
          @{displayName}
        </Text>
      </View>
    </View>
  );
}

function getStyles(size: 'small' | 'medium' | 'large') {
  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const isLarge = size === 'large';

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Author badge styles (unified for both official and community)
    authorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmall ? 6 : isMedium ? 8 : 10,
    },
    avatar: {
      width: isSmall ? 20 : isMedium ? 24 : 28,
      height: isSmall ? 20 : isMedium ? 24 : 28,
      borderRadius: isSmall ? 10 : isMedium ? 12 : 14,
      backgroundColor: AppColors.surface,
      borderWidth: 1,
      borderColor: AppColors.border,
    },
    avatarPlaceholder: {
      width: isSmall ? 20 : isMedium ? 24 : 28,
      height: isSmall ? 20 : isMedium ? 24 : 28,
      borderRadius: isSmall ? 10 : isMedium ? 12 : 14,
      backgroundColor: AppColors.surface,
      borderWidth: 1,
      borderColor: AppColors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    usernameText: {
      color: AppColors.primary,
      fontSize: isSmall ? 12 : isMedium ? 14 : 16,
      fontWeight: '600',
    },
  });
}
