import { AppColors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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

interface SanctumBackgroundProps {
  children: React.ReactNode;
}

export default function SanctumBackground({ children }: SanctumBackgroundProps) {
  return (
    <View style={styles.outerContainer}>
      <ImageBackground
        source={getSanctumBackground()}
        style={styles.backgroundContainer}
        imageStyle={styles.backgroundImage}
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
