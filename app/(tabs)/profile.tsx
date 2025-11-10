import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { updateUserProfile, uploadProfilePicture, hardResetUserData } from '@/lib/utils/auth';
import { validateUsername, getSuggestedUsernames } from '@/lib/utils/username';
import { getUserStats } from '@/lib/utils/dashboard';
import { FitnessLevel, JourneyFocus, UserStats } from '@/types';
import { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

const JOURNEY_FOCUSES: JourneyFocus[] = ['Injury Prevention', 'Recovery'];
const FITNESS_LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFullName, setEditedFullName] = useState('');
  const [editedUsername, setEditedUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [validatingUsername, setValidatingUsername] = useState(false);
  const [editedJourneyFocus, setEditedJourneyFocus] = useState<JourneyFocus | null>(null);
  const [editedFitnessLevel, setEditedFitnessLevel] = useState<FitnessLevel | null>(null);
  const [editedAge, setEditedAge] = useState('');
  const [showJourneyFocusModal, setShowJourneyFocusModal] = useState(false);
  const [showFitnessLevelModal, setShowFitnessLevelModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Load user stats
  useEffect(() => {
    async function loadStats() {
      if (!user) return;

      try {
        setLoadingStats(true);
        const stats = await getUserStats(user.id);
        setUserStats(stats);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoadingStats(false);
      }
    }

    loadStats();
  }, [user]);

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user) {
        setUploadingImage(true);

        try {
          // Upload image
          const imageUrl = await uploadProfilePicture(user.id, result.assets[0].uri);

          // Update profile with new image URL
          await updateUserProfile(user.id, {
            profile_picture_url: imageUrl,
          });

          await refreshProfile();
          Alert.alert('Success', 'Profile picture updated successfully');
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to upload profile picture');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select image');
    }
  };

  const handleEdit = () => {
    setEditedFullName(profile?.full_name || '');
    setEditedUsername(profile?.username || '');
    setUsernameError('');
    setEditedJourneyFocus(profile?.journey_focus || null);
    setEditedFitnessLevel(profile?.fitness_level || null);
    setEditedAge(profile?.age?.toString() || '');
    setIsEditing(true);
  };

  const handleUsernameChange = async (text: string) => {
    setEditedUsername(text);
    setUsernameError('');

    if (!text || text === profile?.username) {
      return;
    }

    setValidatingUsername(true);
    try {
      const validation = await validateUsername(text, user?.id);
      if (!validation.isValid) {
        setUsernameError(validation.error || 'Invalid username');
      }
    } catch (error) {
      console.error('Username validation error:', error);
    } finally {
      setValidatingUsername(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedFullName('');
    setEditedUsername('');
    setUsernameError('');
    setEditedJourneyFocus(null);
    setEditedFitnessLevel(null);
    setEditedAge('');
  };

  const handleSave = async () => {
    if (!user) return;

    // Check for username errors
    if (usernameError) {
      Alert.alert('Error', 'Please fix the username error before saving');
      return;
    }

    // If username changed, validate it one more time
    if (editedUsername && editedUsername !== profile?.username) {
      const validation = await validateUsername(editedUsername, user.id);
      if (!validation.isValid) {
        setUsernameError(validation.error || 'Invalid username');
        Alert.alert('Error', validation.error || 'Invalid username');
        return;
      }
    }

    try {
      setSaving(true);

      const updates: any = {
        full_name: editedFullName.trim() || null,
        username: editedUsername.trim() || null,
        journey_focus: editedJourneyFocus,
        fitness_level: editedFitnessLevel,
        age: editedAge ? parseInt(editedAge, 10) : null,
      };

      await updateUserProfile(user.id, updates);
      await refreshProfile();

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleResetJourney = async () => {
    Alert.alert(
      'Reset Journey - Warning',
      'This will permanently delete ALL your data including:\n\n• Journey progress and stats\n• Routine completions and history\n• Daily progress tracking\n• Recovery goals and areas\n\nYou will be sent back through onboarding to start fresh.\n\nThis action CANNOT be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            try {
              setResetting(true);
              await hardResetUserData(user.id);
              await refreshProfile();

              // Redirect to onboarding
              router.replace('/(auth)/onboarding');

              Alert.alert('Success', 'Your journey has been reset. Welcome back!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reset journey');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {profile?.profile_picture_url ? (
              <Image
                source={{ uri: profile.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={AppColors.textPrimary} />
            ) : (
              <Ionicons name="camera" size={20} color={AppColors.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={editedFullName}
            onChangeText={setEditedFullName}
            placeholder="Full Name"
            placeholderTextColor={AppColors.textTertiary}
          />
        ) : (
          <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        )}
        <Text style={styles.email}>{user?.email}</Text>
        {profile?.username && !isEditing && (
          <Text style={styles.username}>@{profile.username}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          {!isEditing && (
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={AppColors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Username */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username</Text>
          {isEditing ? (
            <View style={styles.usernameInputContainer}>
              <TextInput
                style={[styles.usernameInput, usernameError && styles.inputError]}
                value={editedUsername}
                onChangeText={handleUsernameChange}
                placeholder="username"
                placeholderTextColor={AppColors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              {validatingUsername && (
                <ActivityIndicator size="small" color={AppColors.primary} style={styles.validatingIcon} />
              )}
            </View>
          ) : (
            <Text style={styles.infoValue}>
              {profile?.username ? `@${profile.username}` : 'Not set'}
            </Text>
          )}
        </View>
        {isEditing && usernameError && (
          <Text style={styles.errorText}>{usernameError}</Text>
        )}
        {isEditing && editedUsername && !usernameError && !validatingUsername && (
          <Text style={styles.helperText}>Username is available!</Text>
        )}

        {/* Journey Focus */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Journey Focus</Text>
          {isEditing ? (
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowJourneyFocusModal(true)}
            >
              <Text style={styles.selectButtonText}>
                {editedJourneyFocus || 'Select'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.infoValue}>
              {profile?.journey_focus || 'Not set'}
            </Text>
          )}
        </View>

        {/* Fitness Level */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fitness Level</Text>
          {isEditing ? (
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowFitnessLevelModal(true)}
            >
              <Text style={styles.selectButtonText}>
                {editedFitnessLevel || 'Select'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.infoValue}>
              {profile?.fitness_level || 'Not set'}
            </Text>
          )}
        </View>

        {/* Age */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Age</Text>
          {isEditing ? (
            <TextInput
              style={styles.ageInput}
              value={editedAge}
              onChangeText={setEditedAge}
              placeholder="Age"
              placeholderTextColor={AppColors.textTertiary}
              keyboardType="number-pad"
              maxLength={3}
            />
          ) : (
            <Text style={styles.infoValue}>
              {profile?.age || 'Not set'}
            </Text>
          )}
        </View>

        {/* Save/Cancel buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Enhanced Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Progress</Text>

        {loadingStats ? (
          <ActivityIndicator size="small" color={AppColors.primary} style={{ marginVertical: 20 }} />
        ) : userStats ? (
          <>
            {/* Harmony Score */}
            <View style={styles.harmonyScoreCard}>
              <View style={styles.harmonyScoreHeader}>
                <Ionicons name="sparkles" size={24} color={AppColors.primary} />
                <Text style={styles.harmonyScoreTitle}>Harmony Score</Text>
              </View>
              <Text style={styles.harmonyScoreValue}>{userStats.harmony_score}/100</Text>
              <Text style={styles.harmonyScoreSubtext}>
                Balance across Mind, Body, and Soul
              </Text>
            </View>

            {/* Per-Category Streaks */}
            <View style={styles.streaksContainer}>
              <View style={styles.streakCard}>
                <View style={[styles.streakIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="fitness" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.streakCategory}>Mind</Text>
                <Text style={styles.streakValue}>{userStats.mind_current_streak} days</Text>
                <Text style={styles.streakSubtext}>
                  Longest: {userStats.mind_longest_streak}
                </Text>
              </View>

              <View style={styles.streakCard}>
                <View style={[styles.streakIcon, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="body" size={24} color="#EF4444" />
                </View>
                <Text style={styles.streakCategory}>Body</Text>
                <Text style={styles.streakValue}>{userStats.body_current_streak} days</Text>
                <Text style={styles.streakSubtext}>
                  Longest: {userStats.body_longest_streak}
                </Text>
              </View>

              <View style={styles.streakCard}>
                <View style={[styles.streakIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="heart" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.streakCategory}>Soul</Text>
                <Text style={styles.streakValue}>{userStats.soul_current_streak} days</Text>
                <Text style={styles.streakSubtext}>
                  Longest: {userStats.soul_longest_streak}
                </Text>
              </View>
            </View>

            {/* Unique Routines */}
            <View style={styles.uniqueRoutinesContainer}>
              <Text style={styles.uniqueRoutinesTitle}>Unique Routines Explored</Text>
              <View style={styles.uniqueRoutinesRow}>
                <View style={styles.uniqueRoutineStat}>
                  <Text style={styles.uniqueRoutineValue}>{userStats.unique_mind_routines}</Text>
                  <Text style={styles.uniqueRoutineLabel}>Mind</Text>
                </View>
                <View style={styles.uniqueRoutineStat}>
                  <Text style={styles.uniqueRoutineValue}>{userStats.unique_body_routines}</Text>
                  <Text style={styles.uniqueRoutineLabel}>Body</Text>
                </View>
                <View style={styles.uniqueRoutineStat}>
                  <Text style={styles.uniqueRoutineValue}>{userStats.unique_soul_routines}</Text>
                  <Text style={styles.uniqueRoutineLabel}>Soul</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noDataText}>No stats available yet. Start completing routines!</Text>
        )}
      </View>

      {profile?.injuries && profile.injuries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Injuries/Limitations</Text>
          <View style={styles.goalsContainer}>
            {profile.injuries.map((injury, index) => (
              <View key={index} style={[styles.goalTag, styles.injuryTag]}>
                <Text style={styles.goalText}>{injury}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Reset Journey Section */}
      <View style={styles.section}>
        <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
        <Text style={styles.dangerZoneSubtitle}>
          Resetting your journey will permanently delete all your progress and data
        </Text>
        <TouchableOpacity
          style={[styles.resetButton, resetting && styles.buttonDisabled]}
          onPress={handleResetJourney}
          disabled={resetting}
        >
          <Ionicons name="refresh" size={20} color={AppColors.destructive} />
          <Text style={styles.resetButtonText}>
            {resetting ? 'Resetting...' : 'Reset Journey'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Journey Focus Modal */}
      <Modal
        visible={showJourneyFocusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJourneyFocusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowJourneyFocusModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Journey Focus</Text>
            {JOURNEY_FOCUSES.map((focus) => (
              <TouchableOpacity
                key={focus}
                style={styles.modalOption}
                onPress={() => {
                  setEditedJourneyFocus(focus);
                  setShowJourneyFocusModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{focus}</Text>
                {editedJourneyFocus === focus && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fitness Level Modal */}
      <Modal
        visible={showFitnessLevelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFitnessLevelModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFitnessLevelModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Fitness Level</Text>
            {FITNESS_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={styles.modalOption}
                onPress={() => {
                  setEditedFitnessLevel(level);
                  setShowFitnessLevelModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{level}</Text>
                {editedFitnessLevel === level && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    padding: 24,
    paddingTop: 100,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.surface,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  username: {
    fontSize: 14,
    color: AppColors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
    padding: 24,
    backgroundColor: AppColors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '500',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.primary,
    paddingBottom: 4,
    textAlign: 'center',
    minWidth: 200,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  infoLabel: {
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalTag: {
    backgroundColor: AppColors.lightBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  injuryTag: {
    backgroundColor: AppColors.lightOrange,
  },
  goalText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  selectButtonText: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
  ageInput: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.primary,
    paddingVertical: 4,
    minWidth: 60,
    textAlign: 'right',
  },
  usernameInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.primary,
    paddingVertical: 4,
    minWidth: 150,
    textAlign: 'right',
  },
  inputError: {
    borderBottomColor: AppColors.destructive,
  },
  validatingIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: AppColors.destructive,
    marginTop: 4,
    textAlign: 'right',
  },
  helperText: {
    fontSize: 12,
    color: AppColors.success,
    marginTop: 4,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: AppColors.surface,
    borderWidth: 2,
    borderColor: AppColors.border,
  },
  cancelButtonText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: AppColors.primary,
  },
  saveButtonText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalOptionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  signOutButton: {
    backgroundColor: AppColors.destructive,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.destructive,
    marginBottom: 8,
  },
  dangerZoneSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: AppColors.destructive,
    borderRadius: 8,
    padding: 16,
    backgroundColor: AppColors.surface,
  },
  resetButtonText: {
    color: AppColors.destructive,
    fontSize: 16,
    fontWeight: '600',
  },
  // Enhanced Stats Styles
  harmonyScoreCard: {
    backgroundColor: AppColors.lightGold,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  harmonyScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  harmonyScoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  harmonyScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: AppColors.primary,
    marginBottom: 4,
  },
  harmonyScoreSubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  streaksContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  streakCard: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  streakSubtext: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  uniqueRoutinesContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  uniqueRoutinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  uniqueRoutinesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  uniqueRoutineStat: {
    alignItems: 'center',
  },
  uniqueRoutineValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  uniqueRoutineLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  noDataText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
  },
});
