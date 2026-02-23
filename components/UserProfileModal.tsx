import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import HapticPressable from '@/components/HapticPressable'
import { AppColors } from '@/constants/theme'
import { ActivityFeedItem, CircleRole, Profile, UserLevelSummary } from '@/types'
import { getUserLevelSummary } from '@/lib/utils/leveling'
import { supabase } from '@/lib/supabase/client'

interface UserProfileModalProps {
  visible: boolean
  onClose: () => void
  profile: Profile | null
  memberRole: CircleRole
  joinedAt: string
  isCurrentUser: boolean
  isCurrentUserAdmin: boolean
  onRemoveMember: (userId: string, userName: string) => void
}

function getFullName(profile: Profile): string {
  if (profile.first_name) {
    return profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.first_name
  }
  return 'Unknown User'
}

function getInitial(profile: Profile): string {
  if (profile.first_name) return profile.first_name.charAt(0).toUpperCase()
  if (profile.username) return profile.username.charAt(0).toUpperCase()
  return '?'
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return past.toLocaleDateString()
}

export default function UserProfileModal({
  visible,
  onClose,
  profile,
  memberRole,
  joinedAt,
  isCurrentUser,
  isCurrentUserAdmin,
  onRemoveMember,
}: UserProfileModalProps): React.JSX.Element {
  const [levels, setLevels] = useState<UserLevelSummary | null>(null)
  const [activities, setActivities] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible && profile) {
      setLoading(true)

      const fetchData = async (): Promise<void> => {
        try {
          // Fetch stats + activity via RPC (bypasses RLS for other users)
          const [statsResult, activityResult] = await Promise.all([
            supabase.rpc('get_user_public_stats', { p_user_id: profile.id }),
            supabase.rpc('get_user_recent_activity', { p_user_id: profile.id, p_limit: 3 }),
          ])

          if (statsResult.data && statsResult.data.length > 0) {
            const row = statsResult.data[0]
            const summary = getUserLevelSummary({
              total_xp: row.total_xp ?? 0,
              mind_xp: row.mind_xp ?? 0,
              body_xp: row.body_xp ?? 0,
              soul_xp: row.soul_xp ?? 0,
            } as any)
            setLevels(summary)
          }

          if (activityResult.data && activityResult.data.length > 0) {
            const formatted: ActivityFeedItem[] = activityResult.data.map((row: any) => {
              const activityType = row.activity_type
              let message = ''
              switch (activityType) {
                case 'completed_routine':
                  message = `completed ${row.routine_name || 'a routine'}`
                  if (row.activity_data?.streak > 1) message += ` - ${row.activity_data.streak} day streak!`
                  break
                case 'created_routine':
                  message = `created a new routine: ${row.routine_name || 'Untitled'}`
                  break
                case 'streak_milestone':
                  message = `reached a ${row.activity_data?.milestone || 0} day streak milestone!`
                  break
                case 'joined_circle':
                  message = `joined ${row.circle_name || 'a circle'}`
                  break
                case 'shared_routine':
                  message = `shared ${row.routine_name || 'a routine'}`
                  break
                default:
                  message = activityType.replace(/_/g, ' ')
              }
              return {
                id: row.id,
                user: {
                  id: row.user_id,
                  first_name: row.user_first_name,
                  last_name: row.user_last_name,
                  username: row.user_username,
                  profile_picture_url: row.user_profile_picture_url,
                } as any,
                activityType,
                message,
                timestamp: row.created_at,
                routineId: row.related_routine_id || undefined,
                routineName: row.routine_name || undefined,
                circleId: row.related_circle_id || undefined,
                circleName: row.circle_name || undefined,
                metadata: row.activity_data || undefined,
              }
            })
            setActivities(formatted)
          } else {
            setActivities([])
          }
        } catch (error) {
          console.error('Error fetching member data:', error)
        } finally {
          setLoading(false)
        }
      }

      fetchData()
    } else {
      setLevels(null)
      setActivities([])
    }
  }, [visible, profile?.id])

  if (!profile) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay} />
      </Modal>
    )
  }

  const fullName = getFullName(profile)
  const showRemoveButton =
    isCurrentUserAdmin && !isCurrentUser && memberRole !== 'admin'

  const COMPANION_CONFIG = [
    { key: 'mind' as const, label: 'Mind', color: AppColors.mind, icon: 'bulb-outline' as const },
    { key: 'body' as const, label: 'Body', color: AppColors.body, icon: 'body' as const },
    { key: 'soul' as const, label: 'Soul', color: AppColors.soul, icon: 'flame-outline' as const },
  ]

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <HapticPressable
        style={styles.overlay}
        activeOpacity={1}
        hapticStyle="none"
        onPress={onClose}
      >
        <HapticPressable
          style={styles.modalContainer}
          activeOpacity={1}
          hapticStyle="none"
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <HapticPressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={AppColors.textPrimary} />
            </HapticPressable>
          </View>

          <View style={styles.headerDivider} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* Profile Row: Avatar + Name left, Details right */}
            <View style={styles.profileRow}>
              {/* Left: Avatar + Name + Username */}
              <View style={styles.profileLeft}>
                {profile.profile_picture_url ? (
                  <Image
                    source={{ uri: profile.profile_picture_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{getInitial(profile)}</Text>
                  </View>
                )}
                <Text style={styles.fullName} numberOfLines={2}>{fullName}</Text>
                {profile.username && (
                  <Text style={styles.username}>@{profile.username}</Text>
                )}
              </View>

              {/* Right: Details */}
              <View style={styles.profileRight}>
                {profile.journey_focus && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name={profile.journey_focus === 'Recovery' ? 'heart' : 'shield-checkmark'}
                      size={15}
                      color={profile.journey_focus === 'Recovery' ? AppColors.body : AppColors.mind}
                    />
                    <Text style={styles.detailText}>{profile.journey_focus}</Text>
                  </View>
                )}
                {memberRole === 'admin' && (
                  <View style={styles.detailRow}>
                    <Ionicons name="shield-checkmark" size={15} color={AppColors.primary} />
                    <Text style={[styles.detailText, { color: AppColors.primary }]}>Circle Admin</Text>
                  </View>
                )}
                {profile.role === 'health_team' && (
                  <View style={styles.detailRow}>
                    <Ionicons name="medkit" size={15} color={AppColors.mind} />
                    <Text style={[styles.detailText, { color: AppColors.mind }]}>Health Team</Text>
                  </View>
                )}
                {profile.role === 'admin' && (
                  <View style={styles.detailRow}>
                    <Ionicons name="medkit" size={15} color={AppColors.mind} />
                    <Text style={[styles.detailText, { color: AppColors.mind }]}>App Admin</Text>
                  </View>
                )}
                {profile.journey_started_at && (
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={15} color={AppColors.textTertiary} />
                    <Text style={styles.detailTextMuted}>
                      Joined {formatDate(profile.journey_started_at)}
                    </Text>
                  </View>
                )}
                {joinedAt ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={15} color={AppColors.textTertiary} />
                    <Text style={styles.detailTextMuted}>
                      In circle {formatDate(joinedAt)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Levels Section */}
            {loading ? (
              <ActivityIndicator
                size="small"
                color={AppColors.primary}
                style={styles.loader}
              />
            ) : levels ? (
              <View style={styles.levelsSection}>
                <Text style={styles.sectionTitle}>Soteria Level</Text>

                {/* Soteria Overall Level */}
                <View style={styles.soteriaLevelCard}>
                  <View style={styles.soteriaLevelHeader}>
                    <Ionicons name="trophy" size={20} color={AppColors.primary} />
                    <Text style={styles.soteriaLevelText}>Lv.{levels.soteria.level}</Text>
                    <Text style={styles.soteriaTitle}>{levels.soteria.title}</Text>
                  </View>
                  <View style={styles.xpRow}>
                    <View style={styles.xpBarBg}>
                      <View
                        style={[
                          styles.xpBarFill,
                          {
                            width: `${Math.round(levels.soteria.progress * 100)}%`,
                            backgroundColor: AppColors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.xpText}>
                      {levels.soteria.currentXp}/{levels.soteria.xpForNextLevel}
                    </Text>
                  </View>
                </View>

                {/* Companion Levels */}
                <Text style={styles.sectionTitle}>Companion Stats</Text>
                <View style={styles.companionRows}>
                  {COMPANION_CONFIG.map(({ key, label, color, icon }) => {
                    const info = levels[key]
                    return (
                      <View key={key} style={styles.companionRow}>
                        <View style={[styles.companionBadge, { borderColor: color + '40' }]}>
                          <Ionicons name={icon} size={18} color={color} />
                        </View>
                        <View style={styles.companionBarSection}>
                          <View style={styles.companionBarHeader}>
                            <Text style={[styles.companionLevelText, { color }]}>
                              Lv.{info.level}
                            </Text>
                            <Text style={styles.companionXpText}>
                              {info.currentXp}/{info.xpForNextLevel}
                            </Text>
                          </View>
                          <View style={styles.xpBarBg}>
                            <View
                              style={[
                                styles.xpBarFill,
                                {
                                  width: `${Math.round(info.progress * 100)}%`,
                                  backgroundColor: color,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
            ) : null}

            {/* Recent Activity */}
            {!loading && activities.length > 0 && (
              <View style={styles.activitySection}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {activities.map((activity) => (
                  <View key={activity.id} style={styles.activityCard}>
                    <View style={styles.activityDot} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityMessage} numberOfLines={2}>
                        {activity.message}
                      </Text>
                      <Text style={styles.activityTime}>
                        {getTimeAgo(activity.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Remove Button */}
            {showRemoveButton && (
              <HapticPressable
                style={styles.removeButton}
                hapticStyle="medium"
                onPress={() => onRemoveMember(profile.id, fullName)}
              >
                <Ionicons name="person-remove-outline" size={20} color={AppColors.destructive} />
                <Text style={styles.removeButtonText}>Remove from Circle</Text>
              </HapticPressable>
            )}
          </ScrollView>
        </HapticPressable>
      </HapticPressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: AppColors.primary + '40',
    marginHorizontal: 24,
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },

  // Profile two-column layout
  profileRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  profileLeft: {
    alignItems: 'center',
    width: 120,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: AppColors.primary + '40',
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AppColors.primary + '25',
    borderWidth: 3,
    borderColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarFallbackText: {
    fontSize: 34,
    fontWeight: '700',
    color: AppColors.primary,
  },
  fullName: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  username: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  profileRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  detailTextMuted: {
    fontSize: 13,
    color: AppColors.textTertiary,
  },

  // Loading
  loader: {
    marginVertical: 24,
  },

  // Levels
  levelsSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  soteriaLevelCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: AppColors.primary + '30',
    marginBottom: 20,
  },
  soteriaLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  soteriaLevelText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.primary,
  },
  soteriaTitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: AppColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpText: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'right',
  },

  // Companion levels
  companionRows: {
    gap: 10,
    marginBottom: 24,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companionBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionBarSection: {
    flex: 1,
    gap: 4,
  },
  companionBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  companionLevelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  companionXpText: {
    fontSize: 11,
    color: AppColors.textTertiary,
    fontWeight: '500',
  },

  // Activity
  activitySection: {
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primary,
    marginTop: 6,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: AppColors.textPrimary,
    lineHeight: 20,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },

  // Remove button
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.destructive,
    gap: 8,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.destructive,
  },
})
