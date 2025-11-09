import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import { getDisplayName } from '@/lib/utils/username';
import {
  getCircleDetails,
  getCircleRoutines,
  getCircleActivity,
  shareRoutineToCircle,
  leaveCircle,
  updateCircle,
  deleteCircle,
  inviteToCircle,
  removeMemberFromCircle,
  getUserCircleRole,
} from '@/lib/utils/social';
import {
  CircleWithMembers,
  CircleRoutine,
  ActivityFeedItem,
  CircleRole,
} from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { getFormattedCircleActivity } from '@/lib/utils/social';
import FriendInviteModal from '@/components/FriendInviteModal';
import ActivityCard from '@/components/ActivityCard';

type Tab = 'members' | 'routines' | 'activity';

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circle, setCircle] = useState<CircleWithMembers | null>(null);
  const [userRole, setUserRole] = useState<CircleRole | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('members');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadCircleData();
    }
  }, [id, user]);

  const loadCircleData = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);
      const [circleData, role] = await Promise.all([
        getCircleDetails(id),
        getUserCircleRole(id, user.id),
      ]);
      setCircle(circleData);
      setUserRole(role);
    } catch (error) {
      console.error('Error loading circle:', error);
      Alert.alert('Error', 'Failed to load circle details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCircleData();
    setRefreshing(false);
  };

  const handleLeaveCircle = () => {
    if (!user || !id) return;

    Alert.alert(
      'Leave Circle?',
      `Are you sure you want to leave ${circle?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCircle(id, user.id);
              Alert.alert('Success', 'You have left the circle', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave circle');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCircle = () => {
    if (!id) return;

    Alert.alert(
      'Delete Circle?',
      'This will permanently delete this circle and all its data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCircle(id);
              Alert.alert('Success', 'Circle deleted', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete circle');
            }
          },
        },
      ]
    );
  };

  const handleInviteFriend = async (friendId: string, friendName: string) => {
    if (!id || !user) return;

    try {
      await inviteToCircle(id, friendId, user.id);
      Alert.alert('Success', `Invitation sent to ${friendName}`);
      await handleRefresh();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
      throw error; // Re-throw to let the modal handle it
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!circle) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.textTertiary} />
        <Text style={styles.errorText}>Circle not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAdmin = userRole === 'admin';
  const isCreator = circle.created_by === user?.id;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
          </TouchableOpacity>
          {isAdmin && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowEditModal(true)}
              >
                <Ionicons name="create-outline" size={24} color={AppColors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Circle Info */}
        <View style={styles.infoSection}>
          <View style={styles.circleIconLarge}>
            <Ionicons
              name={circle.is_private ? 'lock-closed' : 'globe'}
              size={32}
              color={AppColors.primary}
            />
          </View>
          <Text style={styles.circleName}>{circle.name}</Text>
          <Text style={styles.circleDescription}>{circle.description || 'No description'}</Text>
          <View style={styles.circleStats}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color={AppColors.textSecondary} />
              <Text style={styles.statText}>{circle.members.length} members</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name={circle.is_private ? 'lock-closed' : 'globe'}
                size={20}
                color={AppColors.textSecondary}
              />
              <Text style={styles.statText}>{circle.is_private ? 'Private' : 'Public'}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isCreator && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteCircle}>
                <Ionicons name="trash-outline" size={20} color={AppColors.destructive} />
                <Text style={styles.deleteButtonText}>Delete Circle</Text>
              </TouchableOpacity>
            )}
            {!isCreator && (
              <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveCircle}>
                <Ionicons name="exit-outline" size={20} color={AppColors.destructive} />
                <Text style={styles.leaveButtonText}>Leave Circle</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Members
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'routines' && styles.tabActive]}
            onPress={() => setActiveTab('routines')}
          >
            <Text style={[styles.tabText, activeTab === 'routines' && styles.tabTextActive]}>
              Routines
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
              Activity
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <MembersTab
            circle={circle}
            isAdmin={isAdmin}
            onRefresh={handleRefresh}
            onInviteClick={() => setShowInviteModal(true)}
            currentUserId={user!.id}
          />
        )}
        {activeTab === 'routines' && <RoutinesTab circleId={id!} userId={user!.id} />}
        {activeTab === 'activity' && <CircleActivityTab circleId={id!} key={refreshing.toString()} />}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Circle Modal */}
      {showEditModal && (
        <EditCircleModal
          visible={showEditModal}
          circle={circle}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            handleRefresh();
          }}
        />
      )}

      {/* Friend Invite Modal */}
      <FriendInviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteFriend}
        currentMemberIds={circle.members.map(m => m.user_id)}
        userId={user!.id}
        circleId={id!}
      />
    </View>
  );
}

// =====================================================
// MEMBERS TAB
// =====================================================

function MembersTab({
  circle,
  isAdmin,
  onRefresh,
  onInviteClick,
  currentUserId,
}: {
  circle: CircleWithMembers;
  isAdmin: boolean;
  onRefresh: () => void;
  onInviteClick: () => void;
  currentUserId: string;
}) {
  const handleRemoveMember = (userId: string, userName: string) => {
    Alert.alert(
      'Remove Member?',
      `Remove ${userName} from this circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberFromCircle(circle.id, userId, currentUserId);
              onRefresh();
              Alert.alert('Success', 'Member removed');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.tabContent}>
      {/* Invite Friends Button */}
      {isAdmin && (
        <TouchableOpacity style={styles.inviteFriendsButton} onPress={onInviteClick}>
          <Ionicons name="person-add" size={20} color={AppColors.primary} />
          <Text style={styles.inviteFriendsButtonText}>Invite Friends</Text>
        </TouchableOpacity>
      )}

      {circle.members.map((member) => (
        <View key={member.id} style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Ionicons name="person" size={24} color={AppColors.textSecondary} />
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {member.profile ? getDisplayName(member.profile) : 'Unknown User'}
            </Text>
            <Text style={styles.memberRole}>
              {member.role === 'admin' ? 'Admin' : 'Member'}
            </Text>
          </View>
          {isAdmin && member.role !== 'admin' && member.user_id !== circle.created_by && (
            <TouchableOpacity
              style={styles.removeMemberButton}
              onPress={() =>
                handleRemoveMember(
                  member.user_id,
                  member.profile ? getDisplayName(member.profile) : 'this user'
                )
              }
            >
              <Ionicons name="close-circle" size={24} color={AppColors.destructive} />
            </TouchableOpacity>
          )}
          {member.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color={AppColors.primary} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// =====================================================
// ROUTINES TAB
// =====================================================

function RoutinesTab({ circleId, userId }: { circleId: string; userId: string }) {
  const router = useRouter();
  const [routines, setRoutines] = useState<CircleRoutine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      const data = await getCircleRoutines(circleId);
      setRoutines(data);
    } catch (error) {
      console.error('Error loading circle routines:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (routines.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="barbell-outline" size={48} color={AppColors.textTertiary} />
        <Text style={styles.emptyText}>No routines shared yet</Text>
        <Text style={styles.emptySubtext}>Members can share routines to this circle</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {routines.map((circleRoutine) => {
        const routine = circleRoutine.routine;
        if (!routine) return null;

        return (
          <TouchableOpacity
            key={circleRoutine.id}
            style={styles.routineCard}
            onPress={() => router.push(`/routines/${routine.id}`)}
          >
            <View style={styles.routineHeader}>
              <Text style={styles.routineName}>{routine.name}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(routine.category) }]}>
                <Text style={styles.categoryText}>{routine.category}</Text>
              </View>
            </View>
            <Text style={styles.routineDescription} numberOfLines={2}>
              {routine.description}
            </Text>
            <View style={styles.routineFooter}>
              <View style={styles.sharedByInfo}>
                <Ionicons name="person-circle-outline" size={16} color={AppColors.textSecondary} />
                <Text style={styles.sharedByText}>
                  Shared by {circleRoutine.sharer_profile ? getDisplayName(circleRoutine.sharer_profile) : 'Unknown'}
                </Text>
              </View>
              <Text style={styles.sharedDate}>
                {new Date(circleRoutine.shared_at).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// =====================================================
// ACTIVITY TAB
// =====================================================

function CircleActivityTab({ circleId }: { circleId: string }) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, [circleId]);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const data = await getFormattedCircleActivity(circleId, 50, 0);
      setActivities(data);
    } catch (error) {
      console.error('Error loading circle activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="newspaper-outline" size={48} color={AppColors.textTertiary} />
        <Text style={styles.emptyText}>No activity in this circle yet</Text>
        <Text style={styles.emptySubtext}>Be the first to share a routine!</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onRoutinePress={(routineId) => router.push(`/routines/${routineId}`)}
        />
      ))}
    </View>
  );
}

// =====================================================
// EDIT CIRCLE MODAL
// =====================================================

function EditCircleModal({
  visible,
  circle,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  circle: CircleWithMembers;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(circle.name);
  const [description, setDescription] = useState(circle.description || '');
  const [isPrivate, setIsPrivate] = useState(circle.is_private);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a circle name');
      return;
    }

    try {
      setUpdating(true);
      await updateCircle(circle.id, {
        name: name.trim(),
        description: description.trim(),
        is_private: isPrivate,
      });
      Alert.alert('Success', 'Circle updated!');
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update circle');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Circle</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Circle Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Circle name"
              placeholderTextColor={AppColors.textPlaceholder}
              value={name}
              onChangeText={setName}
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What is this circle about?"
              placeholderTextColor={AppColors.textPlaceholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.privacyOption}>
              <TouchableOpacity
                style={styles.privacyToggle}
                onPress={() => setIsPrivate(!isPrivate)}
              >
                <Ionicons
                  name={isPrivate ? 'lock-closed' : 'globe'}
                  size={24}
                  color={AppColors.primary}
                />
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>
                    {isPrivate ? 'Private Circle' : 'Public Circle'}
                  </Text>
                  <Text style={styles.privacyDescription}>
                    {isPrivate
                      ? 'Only invited members can join'
                      : 'Anyone can discover and join'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.updateButton, updating && styles.updateButtonDisabled]}
              onPress={handleUpdate}
              disabled={updating}
            >
              <Text style={styles.updateButtonText}>
                {updating ? 'Updating...' : 'Update Circle'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Mind':
      return AppColors.mind;
    case 'Body':
      return AppColors.body;
    case 'Soul':
      return AppColors.soul;
    default:
      return AppColors.primary;
  }
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: AppColors.background,
  },
  errorText: {
    fontSize: 18,
    color: AppColors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 24,
    alignItems: 'center',
  },
  circleIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  circleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  circleDescription: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  circleStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  actionButtons: {
    width: '100%',
    gap: 8,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: AppColors.destructive,
  },
  leaveButtonText: {
    color: AppColors.destructive,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: AppColors.destructive,
  },
  deleteButtonText: {
    color: AppColors.destructive,
    fontSize: 15,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: AppColors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.primary,
  },
  tabContent: {
    padding: 16,
  },
  inviteFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: AppColors.primary,
    gap: 8,
  },
  inviteFriendsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  removeMemberButton: {
    padding: 4,
  },
  adminBadge: {
    padding: 4,
  },
  routineCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routineName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryText: {
    color: AppColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  routineDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  routineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharedByInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sharedByText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  sharedDate: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  activityUserName: {
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textTertiary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: AppColors.textPrimary,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  privacyOption: {
    marginTop: 8,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
  },
  privacyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  privacyDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  updateButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.5,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
});
