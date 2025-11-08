import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { validateUsername, getSuggestedUsernames } from '@/lib/utils/username';
import { updateUserProfile } from '@/lib/utils/auth';
import { useAuth } from '@/lib/contexts/AuthContext';

interface UsernameSetupModalProps {
  visible: boolean;
  onComplete: () => void;
}

export default function UsernameSetupModal({ visible, onComplete }: UsernameSetupModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    if (visible && profile?.full_name) {
      loadSuggestions();
    }
  }, [visible, profile?.full_name]);

  const loadSuggestions = async () => {
    if (!profile?.full_name) return;

    setLoadingSuggestions(true);
    try {
      const suggestedUsernames = await getSuggestedUsernames(profile.full_name, 5);
      setSuggestions(suggestedUsernames);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleUsernameChange = async (text: string) => {
    setUsername(text);
    setUsernameError('');

    if (!text || text.length < 3) {
      return;
    }

    setValidating(true);
    try {
      const validation = await validateUsername(text, user?.id);
      if (!validation.isValid) {
        setUsernameError(validation.error || 'Invalid username');
      }
    } catch (error) {
      console.error('Username validation error:', error);
    } finally {
      setValidating(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setUsername(suggestion);
    handleUsernameChange(suggestion);
  };

  const handleSave = async () => {
    if (!user || !username) return;

    if (usernameError) {
      return;
    }

    // Final validation
    const validation = await validateUsername(username, user.id);
    if (!validation.isValid) {
      setUsernameError(validation.error || 'Invalid username');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(user.id, { username: username.trim() });
      await refreshProfile();
      onComplete();
    } catch (error: any) {
      setUsernameError(error.message || 'Failed to set username');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // User can skip, but they'll be prompted again later
    onComplete();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="person-circle-outline" size={60} color={AppColors.primary} />
              <Text style={styles.title}>Choose Your Username</Text>
              <Text style={styles.subtitle}>
                Pick a unique username to make it easier for friends to find you
              </Text>
            </View>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={[styles.input, usernameError && styles.inputError]}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="username"
                  placeholderTextColor={AppColors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  maxLength={20}
                />
                {validating && (
                  <ActivityIndicator size="small" color={AppColors.primary} style={styles.validatingIcon} />
                )}
              </View>

              {usernameError && (
                <Text style={styles.errorText}>{usernameError}</Text>
              )}
              {username && !usernameError && !validating && username.length >= 3 && (
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={16} color={AppColors.success} />
                  <Text style={styles.successText}>Username is available!</Text>
                </View>
              )}

              <Text style={styles.helperText}>
                3-20 characters, letters, numbers, underscore, or period
              </Text>
            </View>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggestions:</Text>
                <View style={styles.suggestionsGrid}>
                  {loadingSuggestions ? (
                    <ActivityIndicator size="small" color={AppColors.primary} />
                  ) : (
                    suggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion}
                        style={[
                          styles.suggestionChip,
                          username === suggestion && styles.suggestionChipSelected,
                        ]}
                        onPress={() => handleSelectSuggestion(suggestion)}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            username === suggestion && styles.suggestionTextSelected,
                          ]}
                        >
                          @{suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, (saving || !username || usernameError) && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving || !username || !!usernameError}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Saving...' : 'Continue'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleSkip}
                disabled={saving}
              >
                <Text style={styles.secondaryButtonText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  scrollView: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: AppColors.border,
    paddingHorizontal: 12,
  },
  atSymbol: {
    fontSize: 18,
    color: AppColors.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: AppColors.destructive,
  },
  validatingIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: AppColors.destructive,
    marginTop: 8,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  successText: {
    fontSize: 12,
    color: AppColors.success,
  },
  helperText: {
    fontSize: 12,
    color: AppColors.textTertiary,
    marginTop: 8,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  suggestionChipSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  suggestionText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  suggestionTextSelected: {
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: AppColors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
