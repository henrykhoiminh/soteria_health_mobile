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
  getRoutineOfTheDay,
  setRoutineOfTheDay,
  clearRoutineOfTheDay,
  awardRotdBonusXp,
  CIRCLE_ROTD_BONUS_XP,
  RoutineOfTheDay,
} from '@/lib/utils/social';
import {
  CircleWithMembers,
  CircleMember,
  CircleRoutine,
  ActivityFeedItem,
  CircleRole,
} from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import HapticPressable from '@/components/HapticPressable';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import { getFormattedCircleActivity } from '@/lib/utils/social';
import FriendInviteModal from '@/components/FriendInviteModal';
import ActivityCard from '@/components/ActivityCard';
import EnhancedCircleRoutinesTab from '@/components/EnhancedCircleRoutinesTab';
import UserProfileModal from '@/components/UserProfileModal';
import CircleChatTab from '@/components/CircleChatTab';
import { useChatNotifications } from '@/lib/contexts/ChatNotificationsContext';

const TAB_NAMES = ['Activity', 'Chat', 'Routines', 'Members'] as const;

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circle, setCircle] = useState<CircleWithMembers | null>(null);
  const [userRole, setUserRole] = useState<CircleRole | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const { unreadCircles, markCircleAsRead } = useChatNotifications();
  const hasUnreadChat = id ? unreadCircles.get(id) === true : false;

  const pagerRef = useRef<PagerView>(null);
  const lastHapticPage = useRef(0);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRotdPicker, setShowRotdPicker] = useState(false);
  const [showCompletionDetails, setShowCompletionDetails] = useState(false);
  const [routineOfTheDay, setRotdState] = useState<RoutineOfTheDay | null>(null);
  const [isRotdSuggested, setIsRotdSuggested] = useState(false);
  const [circleRoutines, setCircleRoutines] = useState<CircleRoutine[]>([]);
  const bonusAwardTriggered = useRef(false);

  // Mark as read when switching to chat tab
  useEffect(() => {
    if (activeTab === 1 && id) {
      markCircleAsRead(id);
    }
  }, [activeTab, id, markCircleAsRead]);

  useEffect(() => {
    if (id && user) {
      loadCircleData();
    }
  }, [id, user]);

  const loadCircleData = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);
      const [circleData, role, rotd, routines] = await Promise.all([
        getCircleDetails(id),
        getUserCircleRole(id, user.id),
        getRoutineOfTheDay(id).catch(() => null),
        getCircleRoutines(id).catch(() => [] as CircleRoutine[]),
      ]);
      setCircle(circleData);
      setUserRole(role);
      setCircleRoutines(routines);

      bonusAwardTriggered.current = false;
      if (rotd) {
        setRotdState(rotd);
        setIsRotdSuggested(false);
      } else if (routines.length > 0) {
        const validRoutines = routines.filter(r => r.routine);
        if (validRoutines.length > 0) {
          const random = validRoutines[Math.floor(Math.random() * validRoutines.length)];
          const suggested: RoutineOfTheDay = {
            routine: random.routine!,
            setAt: new Date().toISOString(),
            completedCount: 0,
            memberCount: circleData.members.length,
            completedByUserIds: [],
            bonusAwarded: false,
          };
          setRotdState(suggested);
          setIsRotdSuggested(true);
        } else {
          setRotdState(null);
          setIsRotdSuggested(false);
        }
      } else {
        setRotdState(null);
        setIsRotdSuggested(false);
      }
    } catch (error) {
      console.error('Error loading circle:', error);
      Alert.alert('Error', 'Failed to load circle details');
    } finally {
      setLoading(false);
    }
  };

  // Auto-award bonus XP when all members complete the admin-set ROTD
  const allComplete = routineOfTheDay &&
    !isRotdSuggested &&
    routineOfTheDay.completedCount === routineOfTheDay.memberCount &&
    routineOfTheDay.memberCount > 0;

  useEffect(() => {
    if (allComplete && !routineOfTheDay!.bonusAwarded && !bonusAwardTriggered.current && id && circle) {
      bonusAwardTriggered.current = true;
      awardRotdBonusXp(
        id,
        routineOfTheDay!.routine.id,
        routineOfTheDay!.routine.category,
        circle.members.map(m => m.user_id)
      ).then((awarded) => {
        if (awarded) {
          setRotdState(prev => prev ? { ...prev, bonusAwarded: true } : prev);
        }
      }).catch(console.error);
    }
  }, [allComplete, routineOfTheDay?.bonusAwarded]);

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

  // PagerView handlers (following SwipeableTabs pattern)
  const handleTabPress = useCallback((index: number): void => {
    pagerRef.current?.setPage(index);
    setActiveTab(index);
    lastHapticPage.current = index;
  }, []);

  const handlePageScroll = useCallback((e: any): void => {
    const { position, offset } = e.nativeEvent;
    const nearestPage = offset > 0.5 ? position + 1 : position;
    const clampedPage = Math.max(0, Math.min(nearestPage, TAB_NAMES.length - 1));

    if (clampedPage !== lastHapticPage.current) {
      lastHapticPage.current = clampedPage;
      setActiveTab(clampedPage);

      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, []);

  const handlePageSelected = useCallback((e: any): void => {
    const { position } = e.nativeEvent;
    setActiveTab(position);
    lastHapticPage.current = position;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.textTertiary} />
        <Text style={styles.errorText}>Please log in to view circles</Text>
        <HapticPressable style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.backButtonText}>Go to Login</Text>
        </HapticPressable>
      </View>
    );
  }

  if (!circle) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.textTertiary} />
        <Text style={styles.errorText}>Circle not found</Text>
        <HapticPressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </HapticPressable>
      </View>
    );
  }

  const isAdmin = userRole === 'admin';
  const isCreator = circle.created_by === user.id;

  return (
    <SanctumBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <HapticPressable style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
          </HapticPressable>
          <View style={styles.headerActions}>
            {isAdmin && (
              <HapticPressable
                style={styles.actionButton}
                onPress={() => setShowEditModal(true)}
              >
                <Ionicons name="create-outline" size={24} color={AppColors.primary} />
              </HapticPressable>
            )}
            {!isCreator && (
              <HapticPressable
                style={styles.actionButton}
                onPress={handleLeaveCircle}
                hapticStyle="medium"
              >
                <Ionicons name="exit-outline" size={24} color={AppColors.destructive} />
              </HapticPressable>
            )}
          </View>
        </View>

        {/* Circle Info */}
        <View style={styles.infoSection}>
          <Text style={styles.circleName}>{circle.name}</Text>
          {circle.description ? (
            <Text style={styles.circleDescription}>{circle.description}</Text>
          ) : null}
          <View style={styles.circleStats}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color={AppColors.textSecondary} />
              <Text style={styles.statText}>{circle.members.length} members</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name={circle.is_private ? 'lock-closed' : 'globe'}
                size={16}
                color={AppColors.textSecondary}
              />
              <Text style={styles.statText}>{circle.is_private ? 'Private' : 'Public'}</Text>
            </View>
          </View>
        </View>

        {/* Daily Circle Routine */}
        {routineOfTheDay && (
          <View style={[
            styles.rotdCard,
            isRotdSuggested && styles.rotdCardSuggested,
            allComplete && !isRotdSuggested && styles.rotdCardCelebration,
          ]}>
            <View style={styles.rotdHeader}>
              <Ionicons
                name={isRotdSuggested ? 'star-outline' : 'star'}
                size={18}
                color={isRotdSuggested ? 'rgba(245, 158, 11, 0.5)' : '#F59E0B'}
              />
              <Text style={[styles.rotdLabel, isRotdSuggested && styles.rotdLabelSuggested]}>
                Daily Circle Routine!
              </Text>
              {isAdmin && !isRotdSuggested && (
                <>
                  <HapticPressable
                    onPress={() => setShowRotdPicker(true)}
                    hapticStyle="selection"
                    style={styles.rotdHeaderAction}
                  >
                    <Ionicons name="swap-horizontal" size={20} color={AppColors.textTertiary} />
                  </HapticPressable>
                  <HapticPressable
                    onPress={async () => {
                      try {
                        await clearRoutineOfTheDay(id!);
                        const validRoutines = circleRoutines.filter(r => r.routine);
                        if (validRoutines.length > 0) {
                          const random = validRoutines[Math.floor(Math.random() * validRoutines.length)];
                          setRotdState({
                            routine: random.routine!,
                            setAt: new Date().toISOString(),
                            completedCount: 0,
                            memberCount: circle!.members.length,
                            completedByUserIds: [],
                            bonusAwarded: false,
                          });
                          setIsRotdSuggested(true);
                        } else {
                          setRotdState(null);
                        }
                      } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to clear');
                      }
                    }}
                    hapticStyle="medium"
                  >
                    <Ionicons name="close-circle-outline" size={20} color={AppColors.textTertiary} />
                  </HapticPressable>
                </>
              )}
              {isAdmin && isRotdSuggested && (
                <HapticPressable
                  onPress={() => setShowRotdPicker(true)}
                  hapticStyle="selection"
                  style={styles.rotdHeaderAction}
                >
                  <Ionicons name="add-circle" size={22} color="#F59E0B" />
                </HapticPressable>
              )}
            </View>

            {/* Subheader — bonus XP incentive */}
            <Text style={styles.rotdSubheader}>
              Complete as a circle for bonus {routineOfTheDay.routine.category} XP!
            </Text>

            <Text style={styles.rotdRoutineName}>{routineOfTheDay.routine.name}</Text>

            {/* Celebration state or progress bar */}
            {allComplete && !isRotdSuggested ? (
              <View style={styles.rotdCelebrationArea}>
                <Ionicons name="sparkles" size={24} color="#F59E0B" />
                <Text style={styles.rotdCelebrationText}>
                  All members completed! +{CIRCLE_ROTD_BONUS_XP} bonus {routineOfTheDay.routine.category} XP!
                </Text>
              </View>
            ) : (
              <View style={styles.rotdProgressRow}>
                <View style={styles.rotdProgressBar}>
                  <View
                    style={[
                      styles.rotdProgressFill,
                      isRotdSuggested && styles.rotdProgressFillSuggested,
                      {
                        width: routineOfTheDay.memberCount > 0
                          ? `${Math.min((routineOfTheDay.completedCount / routineOfTheDay.memberCount) * 100, 100)}%`
                          : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.rotdProgressText}>
                  {routineOfTheDay.completedCount}/{routineOfTheDay.memberCount}
                </Text>
              </View>
            )}

            {/* Member completion tracker */}
            {circle && circle.members.length > 0 && (
              <HapticPressable
                style={styles.rotdMemberRow}
                onPress={() => setShowCompletionDetails(true)}
                hapticStyle="selection"
              >
                {circle.members.slice(0, 5).map((member) => {
                  const completed = routineOfTheDay.completedByUserIds.includes(member.user_id);
                  return (
                    <View key={member.user_id} style={[styles.rotdMemberAvatar, !completed && styles.rotdMemberAvatarPending]}>
                      {member.profile?.profile_picture_url ? (
                        <Image
                          source={{ uri: member.profile.profile_picture_url }}
                          style={styles.rotdMemberAvatarImage}
                        />
                      ) : (
                        <Text style={styles.rotdMemberAvatarInitial}>
                          {member.profile?.first_name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      )}
                      {completed && (
                        <View style={styles.rotdMemberCheck}>
                          <Ionicons name="checkmark-circle" size={12} color={AppColors.success} />
                        </View>
                      )}
                    </View>
                  );
                })}
                {circle.members.length > 5 && (
                  <View style={styles.rotdMemberOverflow}>
                    <Text style={styles.rotdMemberOverflowText}>+{circle.members.length - 5}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={AppColors.textTertiary} style={{ marginLeft: 4 }} />
              </HapticPressable>
            )}

            {/* Start button (hide when all complete for admin-set) */}
            {!(allComplete && !isRotdSuggested) && (
              <HapticPressable
                style={[styles.rotdStartButton, isRotdSuggested && styles.rotdStartButtonSuggested]}
                onPress={() => router.push(`/routines/${routineOfTheDay.routine.id}`)}
              >
                <Text style={styles.rotdStartButtonText}>Start</Text>
                <Ionicons name="play" size={16} color={AppColors.textPrimary} />
              </HapticPressable>
            )}
          </View>
        )}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {TAB_NAMES.map((name, index) => (
            <HapticPressable
              key={name}
              style={[styles.tab, activeTab === index && styles.tabActive]}
              onPress={() => handleTabPress(index)}
              hapticStyle="selection"
            >
              {index === 1 ? (
                <View style={styles.tabLabelRow}>
                  <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
                    {name}
                  </Text>
                  {hasUnreadChat && <View style={styles.unreadDot} />}
                </View>
              ) : (
                <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
                  {name}
                </Text>
              )}
            </HapticPressable>
          ))}
        </View>

        {/* Swipeable tab content */}
        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageScroll={handlePageScroll}
          onPageSelected={handlePageSelected}
          overdrag
        >
          {/* Activity */}
          <View key="activity" style={styles.page}>
            <ScrollView
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
              <CircleActivityTab circleId={id!} key={refreshing.toString()} />
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>

          {/* Chat */}
          <View key="chat" style={styles.page}>
            <CircleChatTab circleId={id!} />
          </View>

          {/* Routines */}
          <View key="routines" style={styles.page}>
            <ScrollView
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
              <EnhancedCircleRoutinesTab
                circleId={id!}
                isAdmin={isAdmin}
                onRefresh={handleRefresh}
                onSetRoutineOfTheDay={isAdmin ? async (routineId, routineName) => {
                  try {
                    await setRoutineOfTheDay(id!, routineId);
                    const rotd = await getRoutineOfTheDay(id!);
                    setRotdState(rotd);
                    Alert.alert('Success', `"${routineName}" set as Routine of the Day!`);
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to set Routine of the Day');
                  }
                } : undefined}
              />
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>

          {/* Members */}
          <View key="members" style={styles.page}>
            <ScrollView
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
              <MembersTab
                circle={circle}
                isAdmin={isAdmin}
                onRefresh={handleRefresh}
                onInviteClick={() => setShowInviteModal(true)}
                currentUserId={user!.id}
              />
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </PagerView>
      </SafeAreaView>

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
          isCreator={isCreator}
          onDelete={handleDeleteCircle}
        />
      )}

      {/* Friend Invite Modal */}
      <FriendInviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteFriend}
        currentMemberIds={circle.members.map(m => m.user_id)}
        userId={user.id}
        circleId={id!}
      />

      {/* ROTD Completion Details Modal */}
      <Modal
        visible={showCompletionDetails}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCompletionDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Completion Status</Text>
              <HapticPressable onPress={() => setShowCompletionDetails(false)}>
                <Ionicons name="close" size={28} color={AppColors.textPrimary} />
              </HapticPressable>
            </View>
            <ScrollView style={styles.modalBody}>
              {circle && routineOfTheDay && (() => {
                const completedSet = new Set(routineOfTheDay.completedByUserIds);
                const sorted = [...circle.members].sort((a, b) => {
                  const aCompleted = completedSet.has(a.user_id) ? 0 : 1;
                  const bCompleted = completedSet.has(b.user_id) ? 0 : 1;
                  return aCompleted - bCompleted;
                });
                return sorted.map((member) => {
                  const completed = completedSet.has(member.user_id);
                  return (
                    <View key={member.user_id} style={styles.completionDetailRow}>
                      <View style={styles.memberAvatar}>
                        {member.profile?.profile_picture_url ? (
                          <Image
                            source={{ uri: member.profile.profile_picture_url }}
                            style={styles.memberAvatarImage}
                          />
                        ) : (
                          <Text style={styles.memberAvatarText}>
                            {member.profile?.first_name?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.completionDetailName, !completed && styles.completionDetailNamePending]}>
                        {member.profile ? getDisplayName(member.profile) : 'Unknown'}
                      </Text>
                      <Ionicons
                        name={completed ? 'checkmark-circle' : 'time-outline'}
                        size={22}
                        color={completed ? AppColors.success : AppColors.textTertiary}
                      />
                    </View>
                  );
                });
              })()}
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ROTD Picker Modal */}
      <Modal
        visible={showRotdPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRotdPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Routine of the Day</Text>
              <HapticPressable onPress={() => setShowRotdPicker(false)}>
                <Ionicons name="close" size={28} color={AppColors.textPrimary} />
              </HapticPressable>
            </View>
            <ScrollView style={styles.modalBody}>
              {circleRoutines.filter(r => r.routine).length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="barbell-outline" size={48} color={AppColors.textTertiary} />
                  <Text style={styles.emptyText}>No routines available</Text>
                  <Text style={styles.emptySubtext}>Add routines to the circle first</Text>
                </View>
              ) : (
                circleRoutines.filter(r => r.routine).map((cr) => (
                  <HapticPressable
                    key={cr.id}
                    style={styles.rotdPickerItem}
                    onPress={async () => {
                      try {
                        await setRoutineOfTheDay(id!, cr.routine!.id);
                        const rotd = await getRoutineOfTheDay(id!);
                        setRotdState(rotd);
                        setIsRotdSuggested(false);
                        setShowRotdPicker(false);
                        Alert.alert('Success', `"${cr.routine!.name}" set as Routine of the Day!`);
                      } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to set Routine of the Day');
                      }
                    }}
                  >
                    <View style={[
                      styles.rotdPickerDot,
                      { backgroundColor: getCategoryColor(cr.routine!.category) },
                    ]} />
                    <View style={styles.rotdPickerItemInfo}>
                      <Text style={styles.rotdPickerItemName}>{cr.routine!.name}</Text>
                      <Text style={styles.rotdPickerItemMeta}>
                        {cr.routine!.duration_minutes} min · {cr.routine!.difficulty} · {cr.routine!.category}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={AppColors.textTertiary} />
                  </HapticPressable>
                ))
              )}
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SanctumBackground>
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
  const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null);

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
        <HapticPressable style={styles.inviteFriendsButton} onPress={onInviteClick}>
          <Ionicons name="person-add" size={20} color={AppColors.primary} />
          <Text style={styles.inviteFriendsButtonText}>Invite Friends</Text>
        </HapticPressable>
      )}

      {circle.members.map((member) => (
        <HapticPressable
          key={member.id}
          style={styles.memberCard}
          onPress={() => setSelectedMember(member)}
        >
          <View style={styles.memberAvatar}>
            {member.profile?.profile_picture_url ? (
              <Image
                source={{ uri: member.profile.profile_picture_url }}
                style={styles.memberAvatarImage}
              />
            ) : (
              <Text style={styles.memberAvatarText}>
                {member.profile?.first_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
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
            <HapticPressable
              style={styles.removeMemberButton}
              onPress={() =>
                handleRemoveMember(
                  member.user_id,
                  member.profile ? getDisplayName(member.profile) : 'this user'
                )
              }
              hapticStyle="medium"
            >
              <Ionicons name="close-circle" size={24} color={AppColors.destructive} />
            </HapticPressable>
          )}
          {member.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color={AppColors.primary} />
            </View>
          )}
        </HapticPressable>
      ))}

      <UserProfileModal
        visible={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
        profile={selectedMember?.profile ?? null}
        memberRole={selectedMember?.role ?? 'member'}
        joinedAt={selectedMember?.joined_at ?? ''}
        isCurrentUser={selectedMember?.user_id === currentUserId}
        isCurrentUserAdmin={isAdmin}
        onRemoveMember={(userId, userName) => {
          setSelectedMember(null);
          handleRemoveMember(userId, userName);
        }}
      />
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
          <HapticPressable
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
          </HapticPressable>
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
  isCreator,
  onDelete,
}: {
  visible: boolean;
  circle: CircleWithMembers;
  onClose: () => void;
  onSuccess: () => void;
  isCreator: boolean;
  onDelete: () => void;
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
            <HapticPressable onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </HapticPressable>
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
              <HapticPressable
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
              </HapticPressable>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <HapticPressable
              style={[styles.updateButton, updating && styles.updateButtonDisabled]}
              onPress={handleUpdate}
              disabled={updating}
            >
              <Text style={styles.updateButtonText}>
                {updating ? 'Updating...' : 'Update Circle'}
              </Text>
            </HapticPressable>

            {isCreator && (
              <HapticPressable
                style={styles.deleteButtonModal}
                onPress={() => {
                  onClose();
                  onDelete();
                }}
                hapticStyle="medium"
              >
                <Ionicons name="trash-outline" size={20} color={AppColors.destructive} />
                <Text style={styles.deleteButtonModalText}>Delete Circle</Text>
              </HapticPressable>
            )}
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
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  circleName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  circleDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  circleStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
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
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.success,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
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
  memberAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.primary,
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
  deleteButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: AppColors.destructive,
    gap: 8,
  },
  deleteButtonModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.destructive,
  },
  rotdCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rotdCardSuggested: {
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  rotdCardCelebration: {
    borderColor: 'rgba(245, 158, 11, 0.6)',
    borderWidth: 2,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rotdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rotdHeaderAction: {
    padding: 2,
  },
  rotdLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rotdLabelSuggested: {
    color: 'rgba(245, 158, 11, 0.5)',
  },
  rotdSubheader: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  rotdRoutineName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  rotdProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rotdProgressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.surfaceSecondary,
    overflow: 'hidden',
  },
  rotdProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  rotdProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    minWidth: 30,
    textAlign: 'right',
  },
  rotdProgressFillSuggested: {
    backgroundColor: 'rgba(245, 158, 11, 0.4)',
  },
  rotdStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  rotdStartButtonSuggested: {
    backgroundColor: 'rgba(245, 158, 11, 0.6)',
  },
  rotdStartButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  rotdCelebrationArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  rotdCelebrationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  rotdMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  rotdMemberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -4,
    borderWidth: 1.5,
    borderColor: AppColors.surface,
  },
  rotdMemberAvatarPending: {
    opacity: 0.4,
  },
  rotdMemberAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  rotdMemberAvatarInitial: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  rotdMemberCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: AppColors.surface,
    borderRadius: 6,
  },
  rotdMemberOverflow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -4,
    borderWidth: 1.5,
    borderColor: AppColors.surface,
  },
  rotdMemberOverflowText: {
    fontSize: 9,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  completionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  completionDetailName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginLeft: 12,
  },
  completionDetailNamePending: {
    color: AppColors.textSecondary,
  },
  rotdPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  rotdPickerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  rotdPickerItemInfo: {
    flex: 1,
  },
  rotdPickerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  rotdPickerItemMeta: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
});
