import Avatar from '@/components/Avatar';
import ParticleField from '@/components/Dashboard/ParticleField';
import { AvatarState, RoutineCategory } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface SanctumSceneProps {
  profile: any;
  avatarStates: AvatarState[];
  onAvatarClick: (category: RoutineCategory) => void;
}

export default function SanctumScene({
  profile,
  avatarStates,
  onAvatarClick,
}: SanctumSceneProps) {
  const getCompanionName = (category: RoutineCategory): string | null | undefined => {
    switch (category) {
      case 'Mind': return profile?.mind_name;
      case 'Body': return profile?.body_name;
      case 'Soul': return profile?.soul_name;
      default: return null;
    }
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
          <Avatar
            key={avatarState.category}
            category={avatarState.category}
            lightState={avatarState.lightState}
            name={getCompanionName(avatarState.category)}
            onPress={() => onAvatarClick(avatarState.category)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 200,
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
});
