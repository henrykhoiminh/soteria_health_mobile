/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#F7DD6F';  // Soteria's guiding light - soft gold
const tintColorDark = '#F7DD6F';   // Soteria's guiding light - soft gold

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
  // Primary Brand Colors - Soteria's Guiding Light
  primary: '#F7DD6F',         // Soft gold - Soteria's aura of light
  primaryText: '#1A1A1A',     // Dark text for primary buttons (WCAG AA compliant: 12.87:1 contrast)
  destructive: '#FF3B30',
  destructiveText: '#FFFFFF', // White text for destructive buttons

  // Category Colors (kept for good contrast on dark backgrounds)
  mind: '#3B82F6',
  body: '#EF4444',
  soul: '#F59E0B',

  // Background Colors - Deep Black Mode
  background: '#0A0A0A',      // True black with subtle warmth (OLED-friendly)
  surface: '#141414',         // Deep black for cards/elevation
  surfaceSecondary: '#1C1C1C', // Darker secondary surfaces
  inputBackground: '#1F1F1F',  // Dark input fields

  // Text Colors - Deep Black Mode
  textPrimary: '#FFFFFF',     // White for primary text (21:1 contrast)
  textSecondary: '#A8A8A8',   // Light grey for secondary text (11.5:1 contrast)
  textTertiary: '#707070',    // Medium grey for tertiary text (5.8:1 contrast)
  textPlaceholder: '#4A4A4A', // Darker grey for placeholders (3.3:1 contrast)

  // Border Colors - Deep Black Mode
  border: '#2A2A2A',          // Subtle border on black background
  borderLight: '#1A1A1A',     // Very subtle border
  cardBorder: '#282828',      // Card borders for elevation

  // Semantic Colors (kept for good contrast)
  success: '#34C759',
  successText: '#FFFFFF',     // White text for success buttons

  // Tag Backgrounds - Deep Black Mode
  lightBlue: '#0F1F3A',       // Deep blue for goals/mind tags
  lightOrange: '#2A1F0F',     // Deep amber for warnings/injuries
  lightGold: '#1F1A0F',       // Deep gold for Soteria-related highlights

  // Header Dynamic Backgrounds (based on completed categories)
  headerMind: '#0F1F3A',      // Deep blue for Mind category completion
  headerBody: '#2A0F0F',      // Deep red for Body category completion
  headerSoul: '#2A1F0F',      // Deep amber for Soul category completion

  // Sanctum / Glass Card Theme
  sanctumOverlay: 'rgba(10, 10, 10, 0.6)',   // Deep content overlay on glass cards
  glassBackground: 'rgba(20, 10, 10, 0.65)', // Semi-transparent glass - sanctum shows through
  glassEdge: 'rgba(247, 221, 111, 0.25)',    // Gold border on glass cards
};

// Card Elevation Style (for consistent card appearance) - Dark Mode Adjusted
export const CardElevation = {
  borderWidth: 1,
  borderColor: AppColors.cardBorder,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.3,         // Increased for visibility on deep black background
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
