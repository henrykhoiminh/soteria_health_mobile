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

// Soteria Health App Colors
export const AppColors = {
  // Primary Brand Colors
  primary: '#3533cd',
  destructive: '#FF3B30',

  // Category Colors
  mind: '#3B82F6',
  body: '#EF4444',
  soul: '#F59E0B',

  // Background Colors
  background: '#F8FAFC',  // Soft blue-gray main background
  surface: '#fff',         // Card and section backgrounds
  inputBackground: '#f5f5f5',

  // Text Colors
  textPrimary: '#1a1a1a',
  textSecondary: '#666',
  textTertiary: '#999',

  // Border Colors
  border: '#ddd',
  borderLight: '#f0f0f0',
  cardBorder: '#E2E8F0',   // Card borders for elevation

  // Semantic Colors
  success: '#34C759',

  // Tag Backgrounds
  lightBlue: '#E3F2FD',
  lightOrange: '#FFF3E0',
};

// Card Elevation Style (for consistent card appearance)
export const CardElevation = {
  borderWidth: 1,
  borderColor: AppColors.cardBorder,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
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
