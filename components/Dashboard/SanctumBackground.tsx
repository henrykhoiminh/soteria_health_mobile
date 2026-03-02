import { AppColors } from '@/constants/theme';
import { RoutineCategory } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const SANCTUM_BACKGROUNDS = {
  sunrise: require('@/assets/images/sanctum-bg-sunrise.png'),
  day: require('@/assets/images/sanctum-bg-1.png'),
  twilight: require('@/assets/images/sanctum-bg-twilight.png'),
  midnight: require('@/assets/images/sanctum-bg-midnight.png'),
};

function getSanctumBackground() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return SANCTUM_BACKGROUNDS.sunrise;
  if (hour >= 11 && hour < 17) return SANCTUM_BACKGROUNDS.day;
  if (hour >= 17 && hour < 21) return SANCTUM_BACKGROUNDS.twilight;
  return SANCTUM_BACKGROUNDS.midnight;
}

// Horizontal offset to focus on where each companion sits on the dashboard
const FOCUS_TRANSLATE_X: Record<RoutineCategory, number> = {
  Mind: SCREEN_WIDTH * 0.2,   // shift right to reveal left portion
  Body: 0,                     // center, no shift
  Soul: -SCREEN_WIDTH * 0.2,  // shift left to reveal right portion
};
const FOCUS_SCALE = 1.4;

interface SanctumBackgroundProps {
  children: React.ReactNode;
  /** When set, zooms into the region where this companion sits on the dashboard */
  focusCategory?: RoutineCategory;
}

export default function SanctumBackground({ children, focusCategory }: SanctumBackgroundProps) {
  const isFocused = !!focusCategory;

  const focusImageStyle = focusCategory
    ? {
        ...styles.backgroundImage,
        top: -220, // shift up more to keep companion position consistent when zoomed
        transform: [
          { scale: FOCUS_SCALE },
          { translateX: FOCUS_TRANSLATE_X[focusCategory] / FOCUS_SCALE },
        ],
      }
    : styles.backgroundImage;

  return (
    <View style={styles.outerContainer}>
      <ImageBackground
        source={getSanctumBackground()}
        style={[
          styles.backgroundContainer,
          isFocused && styles.backgroundContainerFullScreen,
        ]}
        imageStyle={focusImageStyle}
      >
        <View style={styles.darkOverlay} />
        <LinearGradient
          colors={['transparent', 'rgba(10, 10, 10, 0.5)', 'rgba(10, 10, 10, 0.85)', AppColors.background]}
          locations={[0, 0.3, 0.6, 1]}
          style={styles.fadeGradient}
        />
      </ImageBackground>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.85,
    zIndex: 0,
  },
  backgroundContainerFullScreen: {
    height: SCREEN_HEIGHT,
  },
  backgroundImage: {
    resizeMode: 'cover',
    top: -80,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  fadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
});
