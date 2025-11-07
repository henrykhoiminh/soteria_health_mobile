import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
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
