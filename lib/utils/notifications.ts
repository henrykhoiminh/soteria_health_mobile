import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';

// Configure notification handling behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Get the device push token and register it in Supabase.
 * Call after user logs in.
 */
export async function registerPushToken(userId: string): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    const platform = Platform.OS as 'ios' | 'android' | 'web';

    // Upsert the token (handles duplicate gracefully)
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      console.error('Error registering push token:', error);
    }
  } catch (error) {
    console.error('Error getting push token:', error);
  }
}

/**
 * Remove all push tokens for the current device on logout.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('Error unregistering push token:', error);
    }
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

// =====================================================
// LOCAL NOTIFICATION SCHEDULING
// =====================================================

const STREAK_REMINDER_ID = 'streak-reminder';

/**
 * Schedule a daily streak reminder notification.
 * Fires at 7:00 PM local time if no routine was completed that day.
 */
export async function scheduleStreakReminder(): Promise<void> {
  // Cancel existing reminder first
  await cancelStreakReminder();

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_REMINDER_ID,
    content: {
      title: 'Your companions miss you!',
      body: "Don't break your streak - complete a routine today.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });
}

/**
 * Cancel the streak reminder notification.
 */
export async function cancelStreakReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
}
