import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';
import PainCheckInModal from '@/components/PainCheckInModal';
import { hasCheckedInToday } from '@/lib/utils/pain-checkin';

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [showPainCheckIn, setShowPainCheckIn] = useState(false);

  // Check if pain check-in is needed
  useEffect(() => {
    async function checkPainCheckIn() {
      if (!user || loading || !profile) return;

      // Only check for users in the tabs area AND with completed profile
      const inTabsGroup = segments[0] === '(tabs)';
      const profileComplete = profile?.journey_focus && profile?.fitness_level;

      if (!inTabsGroup || !profileComplete) return;

      try {
        const hasCheckedIn = await hasCheckedInToday(user.id);
        if (!hasCheckedIn) {
          setShowPainCheckIn(true);
        }
      } catch (error) {
        console.error('Error checking pain check-in status:', error);
      }
    }

    checkPainCheckIn();
  }, [user, profile, loading, segments]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentScreen = segments[1];

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Allow staying on onboarding and verify-email screens
      if (currentScreen === 'onboarding' || currentScreen === 'verify-email') {
        return; // Don't redirect, let them complete these screens
      }

      // Check if profile is complete
      if (!profile?.journey_focus || !profile?.fitness_level) {
        // Profile incomplete, redirect to onboarding
        router.replace('/(auth)/onboarding');
      } else {
        // Profile complete, redirect to tabs
        router.replace('/(tabs)');
      }
    }
  }, [user, profile, loading, segments]);

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {/* Pain Check-In Modal */}
      {user && (
        <PainCheckInModal
          visible={showPainCheckIn}
          userId={user.id}
          onComplete={() => {
            setShowPainCheckIn(false);
            // Force navigation to trigger useFocusEffect and refresh dashboard data
            // Small delay ensures modal close animation completes
            setTimeout(() => {
              router.push('/(tabs)');
            }, 50);
          }}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootLayoutNav />
        <StatusBar style="light" />
      </AuthProvider>
    </ThemeProvider>
  );
}
