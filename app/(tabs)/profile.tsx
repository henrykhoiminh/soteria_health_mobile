import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import GlassCard from '@/components/Dashboard/GlassCard';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { updateUserProfile, uploadProfilePicture, hardResetUserData } from '@/lib/utils/auth';
import { validateUsername, getSuggestedUsernames } from '@/lib/utils/username';
import { JourneyFocus, MilestoneSummary, HealthTeamInvitation, HealthTeamStats, UserStats, RoutineCategory } from '@/types';
import { getCompanionImage } from '@/lib/utils/companion-images';
import { getUserLevelSummary, getCategoryTitle } from '@/lib/utils/leveling';
import { getUserStats } from '@/lib/utils/dashboard';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getUserMilestones,
  getMilestoneStats,
  getAchievedMilestones,
} from '@/lib/utils/milestones';
import {
  getMyPendingHealthTeamInvitations,
  getHealthTeamStats,
  leaveHealthTeam,
} from '@/lib/utils/health-team';
import MilestoneCard from '@/components/MilestoneCard';
import UserRoleBadge from '@/components/UserRoleBadge';
import HealthTeamInvitationCard from '@/components/HealthTeamInvitationCard';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import HapticPressable from '@/components/HapticPressable';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useIsTabVisible } from '@/lib/contexts/TabVisibilityContext';

const JOURNEY_FOCUSES: JourneyFocus[] = ['Injury Prevention', 'Recovery'];

const getCategoryColor = (category: RoutineCategory) => {
  switch (category) {
    case 'Mind': return AppColors.mind;
    case 'Body': return AppColors.body;
    case 'Soul': return AppColors.soul;
  }
};

const getCategoryIcon = (category: RoutineCategory) => {
  switch (category) {
    case 'Mind': return 'bulb-outline' as const;
    case 'Body': return 'body' as const;
    case 'Soul': return 'flame' as const;
  }
};

const getCategoryTale = (category: RoutineCategory): string => {
  switch (category) {
    case 'Mind':
      return 'A curious creature, searching for knowledge.\nSeems to enjoy puzzles...';
    case 'Body':
      return 'A physical being, always pushing past its limits. Can\'t stop yelling...';
    case 'Soul':
      return 'A gentle one, constantly yearning for connection. Loves to hug...';
  }
};

function CompanionStatsCard({
  category, color, icon, companionName, level, title, currentXp, xpForNextLevel, progress, userName,
}: {
  category: RoutineCategory;
  color: string;
  icon: 'bulb-outline' | 'body' | 'flame';
  companionName: string;
  level: number;
  title: string;
  currentXp: number;
  xpForNextLevel: number;
  progress: number;
  userName?: string;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const isVisible = useIsTabVisible();

  useEffect(() => {
    if (!isVisible) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: false }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, [isVisible]);

  const companionImage = getCompanionImage(category);

  return (
    <View style={styles.companionCard}>
      {/* Category Title */}
      <Text style={styles.companionCardTitle}>{category}</Text>
      <View style={[styles.companionCardDivider, { backgroundColor: color + '40' }]} />

      {/* Icon + Stats Row */}
      <View style={styles.companionCardRow}>
        {/* Companion Icon */}
        <View style={styles.companionIconWrapper}>
          {companionImage ? (
            <Image source={companionImage} style={styles.companionCardImage} resizeMode="cover" />
          ) : (
            <>
              <Animated.View
                style={[
                  styles.companionGlow,
                  { borderColor: color, opacity: glowAnim,
                    transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.companionIcon,
                  { backgroundColor: color + '25', borderColor: color,
                    transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Ionicons name={icon} size={44} color={color} />
              </Animated.View>
            </>
          )}
        </View>

        {/* Stats Report */}
        <View style={styles.companionDetails}>
          <Text style={styles.companionStatRow}>
            <Text style={[styles.companionStatLabel, { color }]}>Name: </Text>
            <Text style={styles.companionStatValue}>{companionName}</Text>
          </Text>
          <Text style={styles.companionStatRow}>
            <Text style={[styles.companionStatLabel, { color }]}>Class: </Text>
            <Text style={styles.companionStatValue}>{title}</Text>
          </Text>
          <Text style={styles.companionStatRow}>
            <Text style={[styles.companionStatLabel, { color }]}>Origin: </Text>
            <Text style={styles.companionStatValue}>{userName ? `${userName}'s ${category}` : category}</Text>
          </Text>
          <Text style={[styles.companionStatLabel, { color, marginBottom: 2 }]}>Description:</Text>
          <Text style={styles.companionDescValue}>{getCategoryTale(category)}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.companionLevelRow}>
        <Text style={[styles.companionLevelText, { color }]}>Lv.{level}</Text>
        <Text style={styles.companionXpText}>{currentXp}/{xpForNextLevel}</Text>
      </View>
      <View style={styles.companionXpBar}>
        <View style={[styles.companionXpFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [editedUsername, setEditedUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [validatingUsername, setValidatingUsername] = useState(false);
  const [editedJourneyFocus, setEditedJourneyFocus] = useState<JourneyFocus | null>(null);
  const [showJourneyFocusModal, setShowJourneyFocusModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneSummary[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(true);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [healthTeamInvitations, setHealthTeamInvitations] = useState<HealthTeamInvitation[]>([]);
  const [healthTeamStats, setHealthTeamStats] = useState<HealthTeamStats | null>(null);
  const [loadingHealthTeam, setLoadingHealthTeam] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Load milestones and health team data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadMilestones = async () => {
        if (!user) return;

        try {
          const data = await getUserMilestones(user.id);
          setMilestones(data);
        } catch (error) {
          console.error('Error loading milestones:', error);
        } finally {
          setLoadingMilestones(false);
        }
      };

      const loadHealthTeamData = async () => {
        if (!user) return;

        try {
          setLoadingHealthTeam(true);

          // Load pending invitations (for all users)
          const invitations = await getMyPendingHealthTeamInvitations();
          setHealthTeamInvitations(invitations);

          // Load health team stats (only if user is health_team or admin)
          if (profile?.role === 'health_team' || profile?.role === 'admin') {
            const stats = await getHealthTeamStats(user.id);
            setHealthTeamStats(stats);
          }
        } catch (error) {
          console.error('Error loading health team data:', error);
        } finally {
          setLoadingHealthTeam(false);
        }
      };

      const loadStats = async () => {
        if (!user) return;
        try {
          const data = await getUserStats(user.id);
          setUserStats(data);
        } catch (error) {
          console.error('Error loading user stats:', error);
        }
      };

      loadMilestones();
      loadHealthTeamData();
      loadStats();
    }, [user, profile])
  );

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
    setEditedFirstName(profile?.first_name || '');
    setEditedLastName(profile?.last_name || '');
    setEditedUsername(profile?.username || '');
    setUsernameError('');
    setEditedJourneyFocus(profile?.journey_focus || null);
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
    setEditedFirstName('');
    setEditedLastName('');
    setEditedUsername('');
    setUsernameError('');
    setEditedJourneyFocus(null);
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
        first_name: editedFirstName.trim() || null,
        last_name: editedLastName.trim() || null,
        username: editedUsername.trim() || null,
        journey_focus: editedJourneyFocus,
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
      'This will reset your journey data including:\n\n• Journey progress and stats\n• Routine completions and history\n• Daily progress tracking\n\nYour earned milestones will be preserved.\n\nYou will be sent back through onboarding to start fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            try {
              setResetting(true);

              // Perform the hard reset
              await hardResetUserData(user.id);

              // Refresh profile to get the cleared data
              await refreshProfile();

              // Small delay to ensure database has processed all deletions
              await new Promise(resolve => setTimeout(resolve, 500));

              // Redirect to onboarding from the beginning
              router.replace('/onboarding');
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
    <SanctumBackground>
    <ScrollView style={styles.container}>
      {/* Overscroll cover - prevents background reveal on bounce */}
      <View style={styles.overscrollCover} />
      {/* Top gradient for status bar readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.2)', 'transparent']}
        style={styles.topGradient}
      />

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
                {profile?.first_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <HapticPressable
            style={styles.cameraButton}
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={AppColors.textPrimary} />
            ) : (
              <Ionicons name="camera" size={20} color={AppColors.textPrimary} />
            )}
          </HapticPressable>
        </View>
        {isEditing ? (
          <View style={styles.nameEditContainer}>
            <TextInput
              style={styles.nameInput}
              value={editedFirstName}
              onChangeText={setEditedFirstName}
              placeholder="First Name"
              placeholderTextColor={AppColors.textTertiary}
            />
            <TextInput
              style={styles.nameInput}
              value={editedLastName}
              onChangeText={setEditedLastName}
              placeholder="Last Name"
              placeholderTextColor={AppColors.textTertiary}
            />
          </View>
        ) : (
          <Text style={styles.name}>
            {profile?.first_name && profile?.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : profile?.first_name || 'User'}
          </Text>
        )}

        {/* User Role Badge */}
        {profile?.role && profile.role !== 'user' && (
          <View style={styles.roleBadgeContainer}>
            <UserRoleBadge role={profile.role} size="medium" />
          </View>
        )}

        <Text style={styles.email}>{user?.email}</Text>
        {profile?.username && !isEditing && (
          <Text style={styles.username}>@{profile.username}</Text>
        )}
      </View>

      {/* Glass Card Data Sections */}
      <View style={styles.glassCardsContainer}>
      <GlassCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          {!isEditing && (
            <HapticPressable onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={AppColors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </HapticPressable>
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
            <HapticPressable
              style={styles.selectButton}
              onPress={() => setShowJourneyFocusModal(true)}
            >
              <Text style={styles.selectButtonText}>
                {editedJourneyFocus || 'Select'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
            </HapticPressable>
          ) : (
            <Text style={styles.infoValue}>
              {profile?.journey_focus || 'Not set'}
            </Text>
          )}
        </View>

        {/* Save/Cancel buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <HapticPressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </HapticPressable>
            <HapticPressable
              style={[styles.actionButton, styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </HapticPressable>
          </View>
        )}
      </GlassCard>

      {/* Level & XP Section */}
      {userStats && (() => {
        const levelSummary = getUserLevelSummary(userStats);
        return (
          <GlassCard>
            <Text style={styles.sectionTitle}>Level & XP</Text>

            {/* Soteria Level Card */}
            <View style={styles.soteriaLevelCard}>
              <View style={styles.soteriaLevelHeader}>
                <View style={styles.soteriaLevelLeft}>
                  <View style={styles.soteriaLevelIconContainer}>
                    <Ionicons name="trophy" size={28} color={AppColors.primary} />
                  </View>
                  <View>
                    <Text style={styles.soteriaLevelLabel}>Soteria Level</Text>
                    <Text style={styles.soteriaLevelValue}>Lv.{levelSummary.soteria.level}</Text>
                  </View>
                </View>
                <View style={styles.soteriaLevelRight}>
                  <Text style={styles.soteriaLevelTitleLabel}>Class</Text>
                  <Text style={styles.soteriaLevelTitle}>{levelSummary.soteria.title}</Text>
                </View>
              </View>
              <View style={styles.xpProgressContainer}>
                <View style={styles.xpProgressBarBg}>
                  <View style={[styles.xpProgressBarFill, { width: `${Math.round(levelSummary.soteria.progress * 100)}%` }]} />
                </View>
                <Text style={styles.xpProgressText}>
                  {levelSummary.soteria.currentXp} / {levelSummary.soteria.xpForNextLevel} XP
                </Text>
              </View>
            </View>

            {/* Companion Stats Cards */}
            {(['Mind', 'Body', 'Soul'] as RoutineCategory[]).map((cat) => {
              const info = cat === 'Mind' ? levelSummary.mind : cat === 'Body' ? levelSummary.body : levelSummary.soul;
              const color = getCategoryColor(cat);
              const icon = getCategoryIcon(cat);
              const companionName = cat === 'Mind' ? profile?.mind_name : cat === 'Body' ? profile?.body_name : profile?.soul_name;

              return (
                <CompanionStatsCard
                  key={cat}
                  category={cat}
                  color={color}
                  icon={icon}
                  companionName={companionName || cat}
                  level={info.level}
                  title={info.title}
                  currentXp={info.currentXp}
                  xpForNextLevel={info.xpForNextLevel}
                  progress={info.progress}
                  userName={profile?.first_name || undefined}
                />
              );
            })}
          </GlassCard>
        );
      })()}

      {/* Health Team Invitations */}
      {healthTeamInvitations.length > 0 && (
        <GlassCard>
          <Text style={styles.sectionTitle}>Health Team Invitation</Text>
          <View style={styles.healthTeamInvitationContainer}>
            {healthTeamInvitations.map((invitation) => (
              <HealthTeamInvitationCard
                key={invitation.id}
                invitation={invitation}
                onAccept={async () => {
                  // Refresh profile and reload data
                  await refreshProfile();
                  setHealthTeamInvitations([]);
                }}
                onDecline={() => {
                  // Remove invitation from list
                  setHealthTeamInvitations((prev) =>
                    prev.filter((inv) => inv.id !== invitation.id)
                  );
                }}
              />
            ))}
          </View>
        </GlassCard>
      )}

      {/* Health Team Stats */}
      {(profile?.role === 'health_team' || profile?.role === 'admin') && healthTeamStats && (
        <GlassCard>
          <Text style={styles.sectionTitle}>Health Team Stats</Text>
          <View style={styles.healthTeamStatsContainer}>
            <View style={styles.statsGrid}>
              <View style={styles.healthTeamStatCard}>
                <Text style={styles.healthTeamStatValue}>
                  {healthTeamStats.official_routines_created}
                </Text>
                <Text style={styles.healthTeamStatLabel}>Official Routines Created</Text>
              </View>
              <View style={styles.healthTeamStatCard}>
                <Text style={styles.healthTeamStatValue}>
                  {healthTeamStats.total_official_completions}
                </Text>
                <Text style={styles.healthTeamStatLabel}>Total Completions</Text>
              </View>
            </View>
            {healthTeamStats.official_routines_saved > 0 && (
              <View style={[styles.healthTeamStatCard, styles.fullWidthStatCard]}>
                <Text style={styles.healthTeamStatValue}>
                  {healthTeamStats.official_routines_saved}
                </Text>
                <Text style={styles.healthTeamStatLabel}>Total Saves</Text>
              </View>
            )}

            {/* Leave Health Team Button */}
            <HapticPressable
              hapticStyle="medium"
              style={styles.leaveHealthTeamButton}
              onPress={async () => {
                Alert.alert(
                  'Leave Health Team?',
                  'You will no longer be able to create or edit official routines. You can be re-invited later if you change your mind.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Leave Team',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await leaveHealthTeam();
                          await refreshProfile();
                          Alert.alert(
                            'Left Health Team',
                            'You are now a regular user. You can be re-invited to the Health Team at any time.'
                          );
                        } catch (error: any) {
                          Alert.alert('Error', error.message || 'Failed to leave health team');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="exit-outline" size={18} color="#EF4444" />
              <Text style={styles.leaveHealthTeamButtonText}>Leave Health Team</Text>
            </HapticPressable>
          </View>
        </GlassCard>
      )}

      {/* Milestones Section */}
      <GlassCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          {milestones.length > 0 && (
            <HapticPressable
              hapticStyle="selection"
              onPress={() => setShowAllMilestones(!showAllMilestones)}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>
                {showAllMilestones ? 'Show Less' : 'View All'}
              </Text>
              <Ionicons
                name={showAllMilestones ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={AppColors.primary}
              />
            </HapticPressable>
          )}
        </View>

        {loadingMilestones ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={AppColors.primary} />
          </View>
        ) : milestones.length === 0 ? (
          <View style={styles.emptyMilestones}>
            <Ionicons name="trophy-outline" size={48} color={AppColors.textTertiary} />
            <Text style={styles.emptyText}>No milestones yet</Text>
            <Text style={styles.emptySubtext}>
              Complete routines and maintain streaks to earn milestones!
            </Text>
          </View>
        ) : (
          <>
            {/* Stats Summary */}
            <View style={styles.milestoneStats}>
              <View style={styles.milestoneStatCard}>
                <Text style={styles.milestoneStatValue}>
                  {getMilestoneStats(milestones).achieved}
                </Text>
                <Text style={styles.milestoneStatLabel}>Achieved</Text>
              </View>
              <View style={styles.milestoneStatCard}>
                <Text style={styles.milestoneStatValue}>
                  {getMilestoneStats(milestones).inProgress}
                </Text>
                <Text style={styles.milestoneStatLabel}>In Progress</Text>
              </View>
              <View style={styles.milestoneStatCard}>
                <Text style={styles.milestoneStatValue}>
                  {getMilestoneStats(milestones).completionPercentage}%
                </Text>
                <Text style={styles.milestoneStatLabel}>Complete</Text>
              </View>
            </View>

            {/* Milestone Cards */}
            <View style={styles.milestonesContainer}>
              {(showAllMilestones
                ? milestones
                : getAchievedMilestones(milestones).slice(0, 3)
              ).map((milestone) => (
                <MilestoneCard key={milestone.milestone_id} milestone={milestone} />
              ))}

              {!showAllMilestones && getAchievedMilestones(milestones).length > 3 && (
                <HapticPressable
                  style={styles.showMoreButton}
                  onPress={() => setShowAllMilestones(true)}
                >
                  <Text style={styles.showMoreText}>
                    Show {getAchievedMilestones(milestones).length - 3} more achievements
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={AppColors.primary} />
                </HapticPressable>
              )}
            </View>
          </>
        )}
      </GlassCard>

      <GlassCard>
        <HapticPressable hapticStyle="medium" style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </HapticPressable>

        {/* Reset Journey Section */}
        <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
        <Text style={styles.dangerZoneSubtitle}>
          Resetting your journey will permanently delete all your progress and data
        </Text>
        <HapticPressable
          hapticStyle="medium"
          style={[styles.resetButton, resetting && styles.buttonDisabled]}
          onPress={handleResetJourney}
          disabled={resetting}
        >
          <Ionicons name="refresh" size={20} color={AppColors.destructive} />
          <Text style={styles.resetButtonText}>
            {resetting ? 'Resetting...' : 'Reset Journey'}
          </Text>
        </HapticPressable>
      </GlassCard>
      </View>

      {/* Journey Focus Modal */}
      <Modal
        visible={showJourneyFocusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJourneyFocusModal(false)}
      >
        <HapticPressable
          hapticStyle="none"
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowJourneyFocusModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Journey Focus</Text>
            {JOURNEY_FOCUSES.map((focus) => (
              <HapticPressable
                hapticStyle="selection"
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
              </HapticPressable>
            ))}
          </View>
        </HapticPressable>
      </Modal>

    </ScrollView>
    </SanctumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overscrollCover: {
    position: 'absolute',
    top: -600,
    left: 0,
    right: 0,
    height: 600,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 2,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  glassCardsContainer: {
    paddingTop: 8,
    paddingBottom: 40,
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
  roleBadgeContainer: {
    marginTop: 8,
    marginBottom: 8,
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
    marginBottom: 12,
  },
  soteriaLevelCard: {
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
  },
  soteriaLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  soteriaLevelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soteriaLevelIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soteriaLevelLabel: {
    fontSize: 12,
    color: AppColors.textTertiary,
    fontWeight: '500',
  },
  soteriaLevelValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: AppColors.primary,
  },
  soteriaLevelRight: {
    alignItems: 'flex-end',
  },
  soteriaLevelTitleLabel: {
    fontSize: 12,
    color: AppColors.textTertiary,
    fontWeight: '500',
  },
  soteriaLevelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primary,
  },
  xpProgressContainer: {
    gap: 6,
  },
  xpProgressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: AppColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpProgressBarFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 3,
  },
  xpProgressText: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'right',
  },
  companionCard: {
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
  },
  companionCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  companionCardDivider: {
    height: 1,
    marginBottom: 20,
  },
  companionCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    marginBottom: 20,
  },
  companionIconWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
  },
  companionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  companionCardImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  companionDetails: {
    flex: 1,
  },
  companionStatRow: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  companionStatLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  companionStatValue: {
    fontSize: 15,
    fontStyle: 'italic',
    color: AppColors.textSecondary,
  },
  companionDescValue: {
    fontSize: 13,
    fontStyle: 'italic',
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  companionLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  companionLevelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  companionXpText: {
    fontSize: 13,
    color: AppColors.textTertiary,
    fontWeight: '600',
  },
  companionXpBar: {
    width: '100%',
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  companionXpFill: {
    height: '100%',
    borderRadius: 3,
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
  nameEditContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.primary,
    paddingBottom: 4,
    textAlign: 'center',
    minWidth: 120,
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
    backgroundColor: AppColors.glassBackground,
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
    marginTop: 20,
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyMilestones: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  milestoneStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  milestoneStatCard: {
    flex: 1,
    padding: 12,
    backgroundColor: AppColors.glassBackground,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
  },
  milestoneStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  milestoneStatLabel: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  milestonesContainer: {
    gap: 0,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginTop: 8,
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  healthTeamInvitationContainer: {
    marginTop: 12,
  },
  healthTeamStatsContainer: {
    marginTop: 12,
  },
  healthTeamStatCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  fullWidthStatCard: {
    flex: undefined,
    width: '100%',
  },
  healthTeamStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 4,
  },
  healthTeamStatLabel: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    fontWeight: '600',
  },
  leaveHealthTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: AppColors.surface,
    marginTop: 16,
  },
  leaveHealthTeamButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
