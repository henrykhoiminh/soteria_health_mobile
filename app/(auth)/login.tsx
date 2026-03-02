import { AppColors } from '@/constants/theme';
import { getUserProfile, signIn } from '@/lib/utils/auth';
import HapticPressable from '@/components/HapticPressable';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { user } = await signIn(email, password);

      if (!user) {
        Alert.alert('Error', 'Failed to sign in. Please try again.');
        return;
      }

      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        Alert.alert(
          'Email Not Verified',
          'Please check your email and click the confirmation link before signing in.',
          [
            {
              text: 'OK',
              onPress: () => {
                // User stays on login screen
              },
            },
          ]
        );
        return;
      }

      // Email is confirmed, check if profile is complete
      const profile = await getUserProfile(user.id);

      if (!profile?.onboarding_completed) {
        // Profile incomplete, redirect to narrative onboarding
        router.replace('/onboarding');
      } else {
        // Profile complete, redirect to dashboard
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SanctumBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Image
              source={require('@/assets/images/soteria-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={AppColors.textPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor={AppColors.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <HapticPressable
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={AppColors.textSecondary}
                  />
                </HapticPressable>
              </View>

              <HapticPressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Entering...' : 'Enter Soteria'}
                </Text>
              </HapticPressable>

              <HapticPressable
                style={styles.linkButton}
                onPress={() => router.push('/(auth)/signup')}
                disabled={loading}
              >
                <Text style={styles.linkText}>
                  Don't have an account? Sign up
                </Text>
              </HapticPressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SanctumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    paddingVertical: 24,
  },
  logo: {
    width: '100%',
    height: 440,
    marginBottom: 16,
    marginTop: 24,
    alignSelf: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: AppColors.textPrimary,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    color: AppColors.textPrimary,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: AppColors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: AppColors.primary,
    fontSize: 14,
  },
});
