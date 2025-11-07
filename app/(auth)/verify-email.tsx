import { supabase } from '@/lib/supabase/client';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResendEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address not found');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      Alert.alert(
        'Email Sent',
        'Verification email has been resent. Please check your inbox.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons name="mail-outline" size={80} color={AppColors.primary} />
      </View>

      <Text style={styles.title}>Check Your Email</Text>

      <Text style={styles.message}>
        We've sent a verification link to:
      </Text>

      <Text style={styles.email}>{email}</Text>

      <Text style={styles.instructions}>
        Click the link in the email to verify your account and complete your profile setup.
      </Text>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={AppColors.textSecondary} />
        <Text style={styles.infoText}>
          The email may take a few minutes to arrive. Check your spam folder if you don't see it.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResendEmail}
        disabled={loading}
      >
        <Ionicons name="refresh-outline" size={20} color={AppColors.textPrimary} />
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'Resend Verification Email'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.replace('/(auth)/login')}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>
          Already verified? Sign In
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: AppColors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
