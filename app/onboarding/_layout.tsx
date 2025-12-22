import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { OnboardingProvider } from '@/lib/contexts/OnboardingContext';
import DevNavigation from './components/DevNavigation';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false, // Prevent swipe back during onboarding
          }}
        >
          {/* New User Flow Screens */}
          <Stack.Screen name="index" />
          <Stack.Screen name="finding-soteria" />
          <Stack.Screen name="journey-focus" />
          <Stack.Screen name="three-lights" />
          <Stack.Screen name="mind-extraction" />
          <Stack.Screen name="body-extraction" />
          <Stack.Screen name="soul-extraction" />
          <Stack.Screen name="introduce-yourself" />
          <Stack.Screen name="traveler-name" />
          <Stack.Screen name="the-pact" />
          <Stack.Screen name="the-beginning" />

          {/* Reset User Flow Screens */}
          <Stack.Screen name="reset-welcome" />
        </Stack>

        {/* DEV ONLY: Navigation controls - remove before production */}
        <DevNavigation />
      </View>
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
