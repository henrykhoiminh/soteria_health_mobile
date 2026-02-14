/**
 * HapticPressable - Drop-in replacement for TouchableOpacity with haptic feedback.
 * Provides subtle tactile feedback on press for a polished app feel.
 */

import * as haptics from '@/lib/utils/haptics';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'none';

interface HapticPressableProps extends TouchableOpacityProps {
  hapticStyle?: HapticStyle;
}

export default function HapticPressable({
  hapticStyle = 'light',
  onPressIn,
  ...props
}: HapticPressableProps) {
  const handlePressIn = (e: any) => {
    switch (hapticStyle) {
      case 'light':
        haptics.light();
        break;
      case 'medium':
        haptics.medium();
        break;
      case 'heavy':
        haptics.heavy();
        break;
      case 'selection':
        haptics.selection();
        break;
    }
    onPressIn?.(e);
  };

  return (
    <TouchableOpacity
      {...props}
      onPressIn={handlePressIn}
    />
  );
}
