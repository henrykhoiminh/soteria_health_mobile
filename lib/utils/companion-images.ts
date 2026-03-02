import { AvatarLightState, RoutineCategory } from '@/types';
import { Asset } from 'expo-asset';
import { ImageSourcePropType } from 'react-native';

const MIND_STATE_IMAGES = {
  Dormant: [require('@/assets/images/mind_states/mind_dormant.png')],
  Sleepy: [require('@/assets/images/mind_states/mind_sleepy.png')],
  Awakening: [
    require('@/assets/images/mind_states/mind_awakening_1.png'),
    require('@/assets/images/mind_states/mind_awakening_2.png'),
  ],
  Glowing: [require('@/assets/images/mind_states/mind_glowing.png')],
  Radiant: [require('@/assets/images/mind_states/mind_radiant.png')],
} as const;

const BODY_STATE_IMAGES = {
  Dormant: [require('@/assets/images/body_states/body_dormant.png')],
  Sleepy: [require('@/assets/images/body_states/body_sleepy.png')],
  Awakening: [require('@/assets/images/body_states/body_awakening.png')],
  Glowing: [require('@/assets/images/body_states/body_glowing.png')],
  Radiant: [require('@/assets/images/body_states/body_glowing.png')], // fallback to Glowing
} as const;

/** Returns the PNG source for a given state image map. */
function getStateImage(
  images: Record<AvatarLightState, readonly ImageSourcePropType[]>,
  lightState: AvatarLightState,
): ImageSourcePropType {
  const variants = images[lightState];
  if (variants.length === 1) return variants[0];
  return variants[Math.random() > 0.5 ? 1 : 0];
}

/** Returns the PNG source for a Mind companion at the given light state. */
export function getMindStateImage(lightState: AvatarLightState): ImageSourcePropType {
  return getStateImage(MIND_STATE_IMAGES, lightState);
}

/** Returns the PNG source for a Body companion at the given light state. */
export function getBodyStateImage(lightState: AvatarLightState): ImageSourcePropType {
  return getStateImage(BODY_STATE_IMAGES, lightState);
}

export interface SlideshowEntry {
  image: ImageSourcePropType | null;
  category: RoutineCategory;
}

/** Returns a shuffled array of all companion state images for loading slideshows. */
export function getAllCompanionSlides(): SlideshowEntry[] {
  const slides: SlideshowEntry[] = [];

  // Mind states
  for (const variants of Object.values(MIND_STATE_IMAGES)) {
    for (const img of variants) {
      slides.push({ image: img, category: 'Mind' });
    }
  }

  // Body states (skip duplicate Radiant→Glowing)
  const bodyStates = ['Dormant', 'Sleepy', 'Awakening', 'Glowing'] as const;
  for (const state of bodyStates) {
    for (const img of BODY_STATE_IMAGES[state]) {
      slides.push({ image: img, category: 'Body' });
    }
  }

  // Soul placeholder states
  for (let i = 0; i < 4; i++) {
    slides.push({ image: null, category: 'Soul' });
  }

  // Shuffle
  for (let i = slides.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slides[i], slides[j]] = [slides[j], slides[i]];
  }

  return slides;
}

/**
 * Returns the companion image source for a category, or null if no assets exist yet.
 * Soul returns null (no PNG assets yet).
 */
export function getCompanionImage(
  category: RoutineCategory,
  lightState?: AvatarLightState,
): ImageSourcePropType | null {
  const state = lightState ?? 'Glowing';
  if (category === 'Mind') return getMindStateImage(state);
  if (category === 'Body') return getBodyStateImage(state);
  // Soul doesn't have PNG assets yet
  return null;
}

// All image assets that should be preloaded for the dashboard
const SANCTUM_BACKGROUNDS = [
  require('@/assets/images/sanctum-bg-sunrise.png'),
  require('@/assets/images/sanctum-bg-1.png'),
  require('@/assets/images/sanctum-bg-twilight.png'),
  require('@/assets/images/sanctum-bg-midnight.png'),
];

let _preloaded = false;

/**
 * Preloads all companion PNG images and sanctum background images into memory.
 * Call during loading screens so assets render instantly when the dashboard appears.
 * Safe to call multiple times — only loads once.
 */
export async function preloadDashboardAssets(): Promise<void> {
  if (_preloaded) return;

  const allImages: ImageSourcePropType[] = [
    ...SANCTUM_BACKGROUNDS,
    // Mind states
    ...Object.values(MIND_STATE_IMAGES).flat(),
    // Body states
    ...Object.values(BODY_STATE_IMAGES).flat(),
  ];

  await Asset.loadAsync(allImages as number[]);
  _preloaded = true;
}
