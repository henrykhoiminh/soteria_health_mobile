/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#3533cd';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// Soteria Health App Colors - Dark Mode Aesthetic
export const AppColors = {
  // Primary Brand Colors (kept for good contrast on dark backgrounds)
  primary: '#3533cd',
  destructive: '#FF3B30',

  // Category Colors (kept for good contrast on dark backgrounds)
  mind: '#3B82F6',
  body: '#EF4444',
  soul: '#F59E0B',

  // Background Colors - Dark Mode
  background: '#1A1A1A',      // Very dark grey, almost black (main background)
  surface: '#2C2C2C',         // Dark grey for cards/elevation
  surfaceSecondary: '#363636', // Lighter grey for nested cards
  inputBackground: '#3A3A3A',  // Dark grey for inputs

  // Text Colors - Dark Mode
  textPrimary: '#FFFFFF',     // White for primary text
  textSecondary: '#B0B0B0',   // Light grey for secondary text
  textTertiary: '#808080',    // Medium grey for tertiary text
  textPlaceholder: '#5A5A5A', // Darker grey for placeholders

  // Border Colors - Dark Mode
  border: '#404040',          // Subtle border on dark background
  borderLight: '#333333',     // Very subtle border
  cardBorder: '#3F3F3F',      // Card borders for elevation

  // Semantic Colors (kept for good contrast)
  success: '#34C759',

  // Tag Backgrounds - Dark Mode
  lightBlue: '#1E3A5F',       // Dark blue for goals/mind tags
  lightOrange: '#4A3A1F',     // Dark amber for warnings/injuries
};

// Card Elevation Style (for consistent card appearance) - Dark Mode Adjusted
export const CardElevation = {
  borderWidth: 1,
  borderColor: AppColors.cardBorder,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,         // Slightly increased for visibility on dark background
  shadowRadius: 3,
  elevation: 2, // For Android
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
