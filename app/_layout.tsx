import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/contexts/AuthContext';
import WellnessCheckInModal from '@/components/WellnessCheckInModal';
import MilestoneCelebrationModal from '@/components/MilestoneCelebrationModal';
import { hasCheckedInToday } from '@/lib/utils/pain-checkin';
import {
  getUncelebratedMilestones,
  markMilestoneCelebrated,
  shareMilestoneToActivity,
} from '@/lib/utils/milestones';
import { UncelebratedMilestone } from '@/types';

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [showWellnessCheckIn, setShowWellnessCheckIn] = useState(false);
  const [milestonesToCelebrate, setMilestonesToCelebrate] = useState<UncelebratedMilestone[]>([]);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState(0);

  // Check if navigation is ready
  const navigationReady = navigationState?.key != null;

  // Check if daily wellness check-in is needed (first login of the day)
  useEffect(() => {
    async function checkWellnessCheckIn() {
      if (!user || loading || !profile) return;

      // Only check for users in the tabs area AND with completed onboarding
      const inTabsGroup = segments[0] === '(tabs)';
      const onboardingComplete = profile?.onboarding_completed === true;

      if (!inTabsGroup || !onboardingComplete) return;

      try {
        const hasCheckedIn = await hasCheckedInToday(user.id);
        if (!hasCheckedIn) {
          // Small delay for smoother UX after navigation
          setTimeout(() => setShowWellnessCheckIn(true), 500);
        }
      } catch (error) {
        console.error('Error checking wellness check-in status:', error);
      }
    }

    checkWellnessCheckIn();
  }, [user, profile, loading, segments]);

  // Check for uncelebrated milestones
  useEffect(() => {
    async function checkMilestones() {
      if (!user || loading || !profile) return;

      // Only check for users in the tabs area AND with completed onboarding
      const inTabsGroup = segments[0] === '(tabs)';
      const onboardingComplete = profile?.onboarding_completed === true;

      if (!inTabsGroup || !onboardingComplete) return;

      try {
        const milestones = await getUncelebratedMilestones(user.id);
        if (milestones.length > 0) {
          setMilestonesToCelebrate(milestones);
          setCurrentMilestoneIndex(0);
        }
      } catch (error) {
        console.error('Error checking milestones:', error);
      }
    }

    checkMilestones();
  }, [user, profile, loading, segments]);

  useEffect(() => {
    if (loading || !navigationReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const currentScreen = segments[1];

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Allow staying on verify-email screen
      if (currentScreen === 'verify-email') {
        return; // Don't redirect, let them complete verification
      }

      // Check if onboarding is complete
      if (!profile?.onboarding_completed) {
        // Onboarding incomplete, redirect to narrative onboarding
        router.replace('/onboarding');
      } else {
        // Onboarding complete, redirect to tabs
        router.replace('/(tabs)');
      }
    } else if (user && !inAuthGroup && !inOnboardingGroup) {
      // User is logged in and not in auth/onboarding groups
      // Check if they need to complete onboarding
      if (!profile?.onboarding_completed) {
        router.replace('/onboarding');
      }
    }
  }, [user, profile, loading, segments, navigationReady]);

  // Handlers for milestone celebration
  const handleMilestoneCelebrated = async () => {
    const currentMilestone = milestonesToCelebrate[currentMilestoneIndex];
    if (!user || !currentMilestone) return;

    try {
      // Mark as celebrated in database
      await markMilestoneCelebrated(user.id, currentMilestone.milestone_id);

      // Show next milestone or close
      if (currentMilestoneIndex < milestonesToCelebrate.length - 1) {
        setCurrentMilestoneIndex(currentMilestoneIndex + 1);
      } else {
        // All milestones celebrated
        setMilestonesToCelebrate([]);
        setCurrentMilestoneIndex(0);
      }
    } catch (error) {
      console.error('Error marking milestone as celebrated:', error);
    }
  };

  const handleShareMilestone = async () => {
    const currentMilestone = milestonesToCelebrate[currentMilestoneIndex];
    if (!user || !currentMilestone) return;

    try {
      await shareMilestoneToActivity(
        user.id,
        currentMilestone.milestone_id,
        currentMilestone.name
      );

      // After sharing, proceed to next milestone
      handleMilestoneCelebrated();
    } catch (error) {
      console.error('Error sharing milestone:', error);
      // Still proceed even if sharing fails
      handleMilestoneCelebrated();
    }
  };

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {/* Daily Wellness Check-In Modal */}
      {user && (
        <WellnessCheckInModal
          visible={showWellnessCheckIn}
          userId={user.id}
          mindName={profile?.mind_name || 'Mind'}
          bodyName={profile?.body_name || 'Body'}
          soulName={profile?.soul_name || 'Soul'}
          onComplete={() => {
            setShowWellnessCheckIn(false);
            // Force navigation to trigger useFocusEffect and refresh dashboard data
            if (navigationReady) {
              setTimeout(() => {
                router.push('/(tabs)');
              }, 50);
            }
          }}
        />
      )}

      {/* Milestone Celebration Modal */}
      {milestonesToCelebrate.length > 0 && (
        <MilestoneCelebrationModal
          visible={true}
          milestone={milestonesToCelebrate[currentMilestoneIndex]}
          onClose={handleMilestoneCelebrated}
          onShare={handleShareMilestone}
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
