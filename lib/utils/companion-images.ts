import { AvatarLightState, RoutineCategory } from '@/types';
import { ImageSourcePropType } from 'react-native';

const MIND_STATE_IMAGES = {
  Dormant: [require('@/assets/images/mind_states/mind_dormant.png')],
  Sleepy: [
    require('@/assets/images/mind_states/mind_sleepy_1.png'),
    require('@/assets/images/mind_states/mind_sleepy_2.png'),
  ],
  Awakening: [
    require('@/assets/images/mind_states/mind_awakening_1.png'),
    require('@/assets/images/mind_states/mind_awakening_2.png'),
  ],
  Glowing: [require('@/assets/images/mind_states/mind_glowing.png')],
  Radiant: [require('@/assets/images/mind_states/mind_radiant.png')],
} as const;

/** Returns the PNG source for a Mind companion at the given light state. */
export function getMindStateImage(lightState: AvatarLightState): ImageSourcePropType {
  const variants = MIND_STATE_IMAGES[lightState];
  if (variants.length === 1) return variants[0];
  return variants[Math.random() > 0.5 ? 1 : 0];
}

/**
 * Returns the companion image source for a category, or null if no assets exist yet.
 * Body and Soul return null (no PNG assets yet).
 */
export function getCompanionImage(
  category: RoutineCategory,
  lightState?: AvatarLightState,
): ImageSourcePropType | null {
  if (category === 'Mind') {
    return getMindStateImage(lightState ?? 'Glowing');
  }
  // Body and Soul don't have PNG assets yet
  return null;
}
