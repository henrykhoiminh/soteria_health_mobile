import Avatar from '@/components/Avatar';
import ParticleField from '@/components/Dashboard/ParticleField';
import { AppColors } from '@/constants/theme';
import { getUserLevelSummary } from '@/lib/utils/leveling';
import { AvatarState, RoutineCategory, UserStats } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

interface SanctumSceneProps {
  profile: any;
  avatarStates: AvatarState[];
  onAvatarClick: (category: RoutineCategory) => void;
  stats?: UserStats | null;
}

const CATEGORY_COLORS: Record<RoutineCategory, string> = {
  Mind: AppColors.mind,
  Body: AppColors.body,
  Soul: AppColors.soul,
};

export default function SanctumScene({
  profile,
  avatarStates,
  onAvatarClick,
  stats,
}: SanctumSceneProps) {
  const getCompanionName = (category: RoutineCategory): string | null | undefined => {
    switch (category) {
      case 'Mind': return profile?.mind_name;
      case 'Body': return profile?.body_name;
      case 'Soul': return profile?.soul_name;
      default: return null;
    }
  };

  const levelSummary = useMemo(() => stats ? getUserLevelSummary(stats) : null, [stats]);

  const getCategoryLevel = (category: RoutineCategory) => {
    if (!levelSummary) return {};
    const info = category === 'Mind' ? levelSummary.mind
      : category === 'Body' ? levelSummary.body
      : levelSummary.soul;
    return {
      level: info.level,
      progress: info.progress,
      categoryColor: CATEGORY_COLORS[category],
    };
  };

  return (
    <View style={styles.container}>
      {/* Top gradient overlay for status bar readability */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.2)', 'transparent']}
        style={styles.topGradient}
      />

      {/* Ambient Particle Field */}
      <ParticleField />

      {/* Companions Row - simple horizontal layout */}
      <View style={styles.companionsRow}>
        {avatarStates.map((avatarState) => (
          <View key={avatarState.category} style={styles.avatarSlot}>
            <Avatar
              category={avatarState.category}
              lightState={avatarState.lightState}
              name={getCompanionName(avatarState.category)}
              onPress={() => onAvatarClick(avatarState.category)}
              {...getCategoryLevel(avatarState.category)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 195,
    paddingBottom: 24,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  companionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginTop: 130,
    marginBottom: 50,
  },
  avatarSlot: {
    flex: 1,
  },
});
