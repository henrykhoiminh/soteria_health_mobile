import { useAuth } from '@/lib/contexts/AuthContext';
import { updateUserProfile, uploadProfilePicture, hardResetUserData } from '@/lib/utils/auth';
import { FitnessLevel, JourneyFocus } from '@/types';
import { useState } from 'react';
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
  const [editedJourneyFocus, setEditedJourneyFocus] = useState<JourneyFocus | null>(null);
  const [editedFitnessLevel, setEditedFitnessLevel] = useState<FitnessLevel | null>(null);
  const [editedAge, setEditedAge] = useState('');
  const [showJourneyFocusModal, setShowJourneyFocusModal] = useState(false);
  const [showFitnessLevelModal, setShowFitnessLevelModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [resetting, setResetting] = useState(false);

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
    setEditedJourneyFocus(profile?.journey_focus || null);
    setEditedFitnessLevel(profile?.fitness_level || null);
    setEditedAge(profile?.age?.toString() || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedFullName('');
    setEditedJourneyFocus(null);
    setEditedFitnessLevel(null);
    setEditedAge('');
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const updates: any = {
        full_name: editedFullName.trim() || null,
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
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={editedFullName}
            onChangeText={setEditedFullName}
            placeholder="Full Name"
            placeholderTextColor="#999"
          />
        ) : (
          <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        )}
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          {!isEditing && (
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color="#3533cd" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

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
              <Ionicons name="chevron-down" size={20} color="#666" />
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
              <Ionicons name="chevron-down" size={20} color="#666" />
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
              placeholderTextColor="#999"
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

      {profile?.goals && profile.goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Goals</Text>
          <View style={styles.goalsContainer}>
            {profile.goals.map((goal, index) => (
              <View key={index} style={styles.goalTag}>
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

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
          <Ionicons name="refresh" size={20} color="#FF3B30" />
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
                  <Ionicons name="checkmark" size={20} color="#3533cd" />
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
                  <Ionicons name="checkmark" size={20} color="#3533cd" />
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 100,
    backgroundColor: '#fff',
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
    backgroundColor: '#3533cd',
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
    color: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3533cd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 16,
    padding: 24,
    backgroundColor: '#fff',
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
    color: '#1a1a1a',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 16,
    color: '#3533cd',
    fontWeight: '500',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#3533cd',
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
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  injuryTag: {
    backgroundColor: '#FFF3E0',
  },
  goalText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  ageInput: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#3533cd',
    paddingVertical: 4,
    minWidth: 60,
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
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3533cd',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  dangerZoneSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  resetButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
