import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AvatarState } from '@/types';
import { getAllAvatarStates } from '@/lib/utils/stats';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type HeaderBackground =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; colors: [string, string, ...string[]]; start: { x: number; y: number }; end: { x: number; y: number } };

const categoryColorMap: Record<string, string> = {
  Mind: AppColors.headerMind,
  Body: AppColors.headerBody,
  Soul: AppColors.headerSoul,
};

function computeHeaderBackground(avatarStates: AvatarState[]): HeaderBackground {
  const completedCategories = avatarStates.filter(
    state => state.lightState === 'Glowing' || state.lightState === 'Radiant'
  );

  if (completedCategories.length === 0) {
    return { type: 'solid', color: AppColors.surface };
  }

  if (completedCategories.length === 1) {
    return { type: 'solid', color: categoryColorMap[completedCategories[0].category] };
  }

  const gradientColors: string[] = [];
  for (const category of ['Mind', 'Body', 'Soul']) {
    if (completedCategories.some(state => state.category === category)) {
      gradientColors.push(categoryColorMap[category]);
    }
  }

  return {
    type: 'gradient',
    colors: gradientColors as [string, string, ...string[]],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  };
}

interface GradientHeaderProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export default function GradientHeader({ style, children }: GradientHeaderProps) {
  const { user } = useAuth();
  const [avatarStates, setAvatarStates] = useState<AvatarState[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getAllAvatarStates(user.id).then(setAvatarStates).catch(() => {});
    }, [user])
  );

  const bg = computeHeaderBackground(avatarStates);

  if (bg.type === 'gradient') {
    return (
      <LinearGradient
        colors={bg.colors}
        start={bg.start}
        end={bg.end}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[style, { backgroundColor: bg.color }]}>
      {children}
    </View>
  );
}
