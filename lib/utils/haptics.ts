/**
 * Haptic Feedback Utilities
 * Centralized haptic feedback for consistent tactile responses across the app.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';

/**
 * Light impact - for navigation taps, card presses, standard button presses
 */
export function light(): void {
  if (isIOS) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * Medium impact - for confirmations, important actions, destructive actions
 */
export function medium(): void {
  if (isIOS) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/**
 * Heavy impact - for major events, completions, celebrations
 */
export function heavy(): void {
  if (isIOS) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

/**
 * Selection - the most subtle, for toggles, filter chips, tab switches, selections
 */
export function selection(): void {
  if (isIOS) {
    Haptics.selectionAsync();
  }
}

/**
 * Success notification - for completed actions, saves, achievements
 */
export function success(): void {
  if (isIOS) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/**
 * Warning notification - for alerts, warnings
 */
export function warning(): void {
  if (isIOS) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

/**
 * Error notification - for errors, failed actions
 */
export function error(): void {
  if (isIOS) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}
