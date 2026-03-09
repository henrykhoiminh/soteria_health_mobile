import HapticPressable from '@/components/HapticPressable';
import RoutineCard from '@/components/RoutineCard';
import { AppColors } from '@/constants/theme';
import { getCompanionImage } from '@/lib/utils/companion-images';
import { AvatarLightState, CategoryLevelInfo, Routine, RoutineCategory } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

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

interface CompletedRoutinesModalProps {
  visible: boolean;
  routines: Routine[];
  onClose: () => void;
  onSelectRoutine: (routineId: string) => void;
  /** If set, shows only routines from this category with level info header */
  categoryFilter?: RoutineCategory;
  /** Level info to display when filtered by category */
  levelInfo?: CategoryLevelInfo;
  /** Companion name for the category */
  companionName?: string;
  /** User's first name for Origin field */
  userName?: string;
  /** Show loading indicator while routines are being fetched */
  loading?: boolean;
  /** Current light state for companion image (used for Mind category) */
  lightState?: AvatarLightState;
}

export default function CompletedRoutinesModal({
  visible,
  routines,
  onClose,
  onSelectRoutine,
  categoryFilter,
  levelInfo,
  companionName,
  userName,
  loading,
  lightState,
}: CompletedRoutinesModalProps) {
  const companionImage = useMemo(
    () => categoryFilter ? getCompanionImage(categoryFilter, lightState) : null,
    [categoryFilter, lightState],
  );

  // Pulsating animation for companion icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible && categoryFilter) {
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
    }
  }, [visible, categoryFilter]);
  const getCategoryColor = (category: RoutineCategory) => {
    switch (category) {
      case 'Mind':
        return AppColors.mind;
      case 'Body':
        return AppColors.body;
      case 'Soul':
        return AppColors.soul;
    }
  };

  const getCategoryIcon = (category: RoutineCategory) => {
    switch (category) {
      case 'Mind':
        return 'bulb-outline' as const;
      case 'Body':
        return 'body' as const;
      case 'Soul':
        return 'flame' as const;
    }
  };

  // Filter routines if a category filter is set
  const displayRoutines = categoryFilter
    ? routines.filter(r => r.category === categoryFilter)
    : routines;

  // Group routines by category (only used when unfiltered)
  const groupedRoutines = {
    Mind: displayRoutines.filter(r => r.category === 'Mind'),
    Body: displayRoutines.filter(r => r.category === 'Body'),
    Soul: displayRoutines.filter(r => r.category === 'Soul'),
  };

  const filterColor = categoryFilter ? getCategoryColor(categoryFilter) : undefined;

  const renderCategorySection = (category: RoutineCategory) => {
    const categoryRoutines = groupedRoutines[category];
    if (categoryRoutines.length === 0) return null;

    const categoryColor = getCategoryColor(category);

    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categorySectionHeader}>
          <Ionicons name={getCategoryIcon(category)} size={20} color={categoryColor} />
          <Text style={[styles.categorySectionTitle, { color: categoryColor }]}>
            {category}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: categoryColor + '20' }]}>
            <Text style={[styles.countBadgeText, { color: categoryColor }]}>
              {categoryRoutines.length}
            </Text>
          </View>
        </View>
        {categoryRoutines.map(routine => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onPress={() => {
              onClose();
              onSelectRoutine(routine.id);
            }}
            compact
          />
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {categoryFilter && levelInfo ? (
              <>
                <Text style={[styles.title, { color: filterColor }]}>{companionName || categoryFilter}</Text>
                <View style={[styles.headerDivider, { backgroundColor: filterColor + '40' }]} />
                {/* Companion + Stats Card Row */}
                <View style={styles.companionRow}>
                  {/* Companion Icon */}
                  <View style={styles.companionIconWrapper}>
                    {companionImage ? (
                      <Image source={companionImage} style={styles.companionImageLarge} resizeMode="cover" />
                    ) : (
                      <>
                        <Animated.View
                          style={[
                            styles.companionGlow,
                            { borderColor: filterColor, opacity: glowAnim,
                              transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }] },
                          ]}
                        />
                        <Animated.View
                          style={[
                            styles.companionIcon,
                            { backgroundColor: filterColor + '25', borderColor: filterColor,
                              transform: [{ scale: pulseAnim }] },
                          ]}
                        >
                          <Ionicons name={getCategoryIcon(categoryFilter)} size={66} color={filterColor} />
                        </Animated.View>
                      </>
                    )}
                  </View>
                  {/* Stats Card */}
                  <View style={styles.companionDetails}>
                    <Text style={styles.companionStatRow}>
                      <Text style={[styles.companionStatLabel, { color: filterColor }]}>Origin: </Text>
                      <Text style={styles.companionStatValue}>{userName ? `${userName}'s ${categoryFilter}` : categoryFilter}</Text>
                    </Text>
                    <Text style={styles.companionStatRow}>
                      <Text style={[styles.companionStatLabel, { color: filterColor }]}>Class: </Text>
                      <Text style={styles.companionStatValue}>{levelInfo.title}</Text>
                    </Text>
                    <Text style={[styles.companionStatLabel, { color: filterColor, marginBottom: 2 }]}>Description:</Text>
                    <Text style={styles.companionDescValue}>{getCategoryTale(categoryFilter)}</Text>
                  </View>
                </View>
                {/* Progress Bar */}
                <View style={styles.headerLevelRow}>
                  <Text style={[styles.headerLevelText, { color: filterColor }]}>Lv.{levelInfo.level}</Text>
                  <Text style={styles.headerXpText}>{levelInfo.currentXp}/{levelInfo.xpForNextLevel}</Text>
                </View>
                <View style={styles.headerXpBar}>
                  <View style={[styles.headerXpFill, { width: `${Math.round(levelInfo.progress * 100)}%`, backgroundColor: filterColor }]} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Completed Routines</Text>
                <Text style={styles.subtitle}>
                  {displayRoutines.length} unique routine{displayRoutines.length !== 1 ? 's' : ''} completed
                </Text>
              </>
            )}
            </View>
            <HapticPressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={AppColors.textPrimary} />
            </HapticPressable>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Routines sub-header */}
            {categoryFilter && displayRoutines.length > 0 && (
              <Text style={styles.routinesSubheader}>
                {displayRoutines.length} Unique Routine{displayRoutines.length !== 1 ? 's' : ''} Completed
              </Text>
            )}

            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={filterColor ?? AppColors.textTertiary} />
              </View>
            ) : displayRoutines.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color={AppColors.textTertiary} />
                <Text style={styles.emptyStateTitle}>No Routines Yet</Text>
                <Text style={styles.emptyStateText}>
                  {categoryFilter
                    ? `Complete your first ${categoryFilter} routine to see it here!`
                    : 'Complete your first routine to see it here!'}
                </Text>
              </View>
            ) : categoryFilter ? (
              /* When filtered, render RoutineCards directly without category headers */
              displayRoutines.map(routine => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onPress={() => {
                    onClose();
                    onSelectRoutine(routine.id);
                  }}
                  compact
                />
              ))
            ) : (
              <>
                {renderCategorySection('Mind')}
                {renderCategorySection('Body')}
                {renderCategorySection('Soul')}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
    marginBottom: 24,
  },
  companionIconWrapper: {
    position: 'relative',
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companionGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
  },
  companionIcon: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  companionImageLarge: {
    width: 132,
    height: 132,
  },
  companionDetails: {
    flex: 1,
    paddingTop: 16,
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
  headerDivider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginTop: 12,
    marginBottom: 28,
  },
  headerLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  headerLevelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerXpText: {
    fontSize: 13,
    color: AppColors.textTertiary,
    fontWeight: '600',
  },
  headerXpBar: {
    width: '100%',
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  headerXpFill: {
    height: '100%',
    borderRadius: 3,
  },
  routinesSubheader: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
});
