import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { AppColors } from '@/constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Routine,
  RoutineCategory,
  RoutineDifficulty,
  RoutineSortOption,
  RoutineSourceFilter,
  JourneyFocus,
  RoutineFilters,
  HarmonyStatus,
} from '@/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getDiscoverRoutines,
  getSavedRoutines,
  getUserCustomRoutines,
  saveRoutine,
  unsaveRoutine,
  getRecentlyCompletedRoutines,
  toggleRoutinePublicStatus,
} from '@/lib/utils/routine-discovery';
import { checkHarmonyRequirements } from '@/lib/utils/harmony';
import RoutineAuthorBadge from '@/components/RoutineAuthorBadge';

const CATEGORIES: RoutineCategory[] = ['Mind', 'Body', 'Soul'];
const DIFFICULTIES: RoutineDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];
const JOURNEY_FOCUSES: JourneyFocus[] = ['Injury Prevention', 'Recovery'];
const SOURCE_FILTERS: { value: RoutineSourceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'official', label: 'Official' },
  { value: 'community', label: 'Community' },
];

type TabType = 'discover' | 'my-routines';

export default function RoutinesScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();
  const [harmonyStatus, setHarmonyStatus] = useState<HarmonyStatus | null>(null);

  // If navigating with a category filter, show discover tab
  const [activeTab, setActiveTab] = useState<TabType>(params.category ? 'discover' : 'discover');

  // Load harmony status once at the top level
  useEffect(() => {
    const loadHarmonyStatus = async () => {
      if (!user) return;
      try {
        const status = await checkHarmonyRequirements(user.id);
        setHarmonyStatus(status);
      } catch (error) {
        console.error('Error loading harmony status:', error);
      }
    };
    loadHarmonyStatus();
  }, [user]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Routines</Text>
        <Text style={styles.subtitle}>Discover and manage your wellness practices</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Ionicons
            name="compass"
            size={18}
            color={activeTab === 'discover' ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-routines' && styles.tabActive]}
          onPress={() => setActiveTab('my-routines')}
        >
          <Ionicons
            name="bookmark"
            size={18}
            color={activeTab === 'my-routines' ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'my-routines' && styles.tabTextActive]}>
            My Routines
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'discover' && user && <DiscoverTab userId={user.id} initialCategory={params.category as RoutineCategory | undefined} isInHarmony={harmonyStatus?.isInHarmony || false} />}
      {activeTab === 'my-routines' && user && <MyRoutinesTab userId={user.id} isInHarmony={harmonyStatus?.isInHarmony || false} />}
    </View>
  );
}

// =====================================================
// DISCOVER TAB
// =====================================================

function DiscoverTab({ userId, initialCategory, isInHarmony }: { userId: string; initialCategory?: RoutineCategory; isInHarmony: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<RoutineSortOption>('popular');
  const [filters, setFilters] = useState<RoutineFilters>(
    initialCategory ? { category: initialCategory } : {}
  );
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Update filters when initialCategory changes (e.g., navigating from dashboard)
  useEffect(() => {
    if (initialCategory) {
      setFilters({ category: initialCategory });
    }
  }, [initialCategory]);

  useEffect(() => {
    loadRoutines();
  }, [sortBy, filters]);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      const data = await getDiscoverRoutines(userId, {
        sort: sortBy,
        filters: { ...filters, searchQuery },
      });
      setRoutines(data);
    } catch (error) {
      console.error('Error loading discover routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoutines();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadRoutines();
  };

  const handleSaveToggle = async (routine: Routine) => {
    try {
      if (routine.is_saved) {
        await unsaveRoutine(userId, routine.id);
      } else {
        await saveRoutine(userId, routine.id);
      }
      // Reload routines to update saved status
      await loadRoutines();
    } catch (error: any) {
      console.error('Error toggling save:', error);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchQuery.length > 0;

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={AppColors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search routines..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor={AppColors.textTertiary}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); handleSearch(); }}>
              <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort and Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
          {/* Sort Dropdown */}
          <TouchableOpacity
            style={[styles.filterChip, styles.sortChip]}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="swap-vertical" size={16} color={AppColors.textPrimary} />
            <Text style={styles.filterChipText}>
              {sortBy === 'popular' && 'Popular'}
              {sortBy === 'trending' && 'Trending'}
              {sortBy === 'newest' && 'Newest'}
              {sortBy === 'most_saved' && 'Most Saved'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={AppColors.textSecondary} />
          </TouchableOpacity>

          {/* Filter Button */}
          <TouchableOpacity
            style={[styles.filterChip, hasActiveFilters && styles.filterChipActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="filter"
              size={16}
              color={hasActiveFilters ? AppColors.textPrimary : AppColors.textSecondary}
            />
            <Text style={[styles.filterChipText, hasActiveFilters && styles.filterChipTextActive]}>
              Filters {hasActiveFilters && `(${Object.keys(filters).length})`}
            </Text>
          </TouchableOpacity>

          {/* Active Filter Chips */}
          {filters.category && (
            <View style={[styles.filterChip, styles.activeFilterChip]}>
              <Text style={styles.activeFilterText}>{filters.category}</Text>
              <TouchableOpacity onPress={() => setFilters({ ...filters, category: undefined })}>
                <Ionicons name="close-circle" size={16} color={AppColors.primary} />
              </TouchableOpacity>
            </View>
          )}
          {filters.difficulty && (
            <View style={[styles.filterChip, styles.activeFilterChip]}>
              <Text style={styles.activeFilterText}>{filters.difficulty}</Text>
              <TouchableOpacity onPress={() => setFilters({ ...filters, difficulty: undefined })}>
                <Ionicons name="close-circle" size={16} color={AppColors.primary} />
              </TouchableOpacity>
            </View>
          )}
          {filters.source && filters.source !== 'all' && (
            <View style={[styles.filterChip, styles.activeFilterChip]}>
              <Text style={styles.activeFilterText}>
                {filters.source === 'official' ? 'Official' : 'Community'}
              </Text>
              <TouchableOpacity onPress={() => setFilters({ ...filters, source: undefined })}>
                <Ionicons name="close-circle" size={16} color={AppColors.primary} />
              </TouchableOpacity>
            </View>
          )}
          {filters.isAdvanced && (
            <View style={[styles.filterChip, styles.advancedFilterChip]}>
              <Ionicons name="sparkles" size={14} color="#F59E0B" />
              <Text style={styles.advancedFilterText}>Advanced</Text>
              <TouchableOpacity onPress={() => setFilters({ ...filters, isAdvanced: undefined })}>
                <Ionicons name="close-circle" size={16} color="#F59E0B" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Routines List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={AppColors.border} />
            <Text style={styles.emptyStateTitle}>No routines found</Text>
            <Text style={styles.emptyStateText}>Try adjusting your filters or search query</Text>
          </View>
        ) : (
          routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onPress={() => router.push(`/routines/${routine.id}`)}
              onSaveToggle={() => handleSaveToggle(routine)}
              isInHarmony={isInHarmony}
            />
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setShowFilterModal(false);
        }}
        onClose={() => setShowFilterModal(false)}
      />

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        currentSort={sortBy}
        onSelect={(option) => {
          setSortBy(option);
          setShowSortModal(false);
        }}
        onClose={() => setShowSortModal(false)}
      />
    </View>
  );
}

// =====================================================
// SORT MODAL
// =====================================================

const SORT_OPTIONS: { value: RoutineSortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'popular', label: 'Popular', icon: 'flame' },
  { value: 'trending', label: 'Trending', icon: 'trending-up' },
  { value: 'newest', label: 'Newest', icon: 'time' },
  { value: 'most_saved', label: 'Most Saved', icon: 'bookmark' },
];

interface SortModalProps {
  visible: boolean;
  currentSort: RoutineSortOption;
  onSelect: (option: RoutineSortOption) => void;
  onClose: () => void;
}

function SortModal({ visible, currentSort, onSelect, onClose }: SortModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sortModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sortModalContent}>
          <Text style={styles.sortModalTitle}>Sort By</Text>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                currentSort === option.value && styles.sortOptionActive,
              ]}
              onPress={() => onSelect(option.value)}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={currentSort === option.value ? AppColors.primary : AppColors.textSecondary}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  currentSort === option.value && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {currentSort === option.value && (
                <Ionicons name="checkmark" size={20} color={AppColors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// =====================================================
// MY ROUTINES TAB
// =====================================================

function MyRoutinesTab({ userId, isInHarmony }: { userId: string; isInHarmony: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedRoutines, setSavedRoutines] = useState<Routine[]>([]);
  const [customRoutines, setCustomRoutines] = useState<Routine[]>([]);
  const [recentRoutines, setRecentRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [saved, custom, recent] = await Promise.all([
        getSavedRoutines(userId),
        getUserCustomRoutines(userId),
        getRecentlyCompletedRoutines(userId, 5),
      ]);
      setSavedRoutines(saved);
      setCustomRoutines(custom);
      setRecentRoutines(recent);
    } catch (error) {
      console.error('Error loading my routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUnsave = async (routineId: string) => {
    try {
      await unsaveRoutine(userId, routineId);
      await loadData();
    } catch (error) {
      console.error('Error unsaving routine:', error);
    }
  };

  const handleTogglePublic = async (routineId: string, isPublic: boolean) => {
    try {
      await toggleRoutinePublicStatus(userId, routineId, !isPublic);
      await loadData();
    } catch (error) {
      console.error('Error toggling public status:', error);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Recently Completed Section */}
      {recentRoutines.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Completed</Text>
          <Text style={styles.sectionSubtitle}>Quick access to your recent routines</Text>
          {recentRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onPress={() => router.push(`/routines/${routine.id}`)}
              compact
              isInHarmony={isInHarmony}
            />
          ))}
        </View>
      )}

      {/* Saved Routines Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Routines ({savedRoutines.length})</Text>
        <Text style={styles.sectionSubtitle}>Routines you've bookmarked from Discover</Text>
        {savedRoutines.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={AppColors.textTertiary} />
            <Text style={styles.emptyText}>No saved routines yet</Text>
            <Text style={styles.emptySubtext}>Explore the Discover tab to find and save routines</Text>
          </View>
        ) : (
          savedRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onPress={() => router.push(`/routines/${routine.id}`)}
              onSaveToggle={() => handleUnsave(routine.id)}
              isInHarmony={isInHarmony}
            />
          ))
        )}
      </View>

      {/* Custom Routines Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My Custom Routines ({customRoutines.length})</Text>
            <Text style={styles.sectionSubtitle}>Routines you've created</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/builder')}
          >
            <Ionicons name="add-circle" size={20} color={AppColors.primary} />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
        {customRoutines.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="create-outline" size={48} color={AppColors.textTertiary} />
            <Text style={styles.emptyText}>No custom routines yet</Text>
            <Text style={styles.emptySubtext}>Create your first routine in the Build tab</Text>
          </View>
        ) : (
          customRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onPress={() => router.push(`/routines/${routine.id}`)}
              isOwner
              onTogglePublic={() => handleTogglePublic(routine.id, routine.is_public || false)}
              isInHarmony={isInHarmony}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// =====================================================
// ROUTINE CARD COMPONENT
// =====================================================

interface RoutineCardProps {
  routine: Routine;
  onPress: () => void;
  onSaveToggle?: () => void;
  isOwner?: boolean;
  onTogglePublic?: () => void;
  compact?: boolean;
  isInHarmony?: boolean;
}

function RoutineCard({
  routine,
  onPress,
  onSaveToggle,
  isOwner,
  onTogglePublic,
  compact,
  isInHarmony = false,
}: RoutineCardProps) {
  const router = useRouter();
  const isLocked = routine.is_advanced && !isInHarmony;

  const handlePress = () => {
    if (isLocked) {
      Alert.alert(
        'Harmony Required',
        'This is an Advanced routine that requires Harmony to access. Achieve Harmony by completing balanced routines (Mind, Body, and Soul) for 7 consecutive days.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.routineCard,
        compact && styles.routineCardCompact,
        isLocked && styles.routineCardLocked,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Locked Overlay for Advanced Routines */}
      {isLocked && (
        <View style={styles.lockedOverlay}>
          <View style={styles.lockedIconContainer}>
            <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
          </View>
        </View>
      )}

      {/* Header with badges */}
      <View style={styles.routineHeader}>
        <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(routine.category) }]} />
        <Text style={[styles.routineName, isLocked && styles.routineNameLocked]} numberOfLines={1}>
          {routine.name}
        </Text>

        {/* Other Badges */}
        {routine.badge_popular && (
          <View style={styles.badgePopular}>
            <Ionicons name="flame" size={14} color="#FF6B35" />
            <Text style={styles.badgePopularText}>Popular</Text>
          </View>
        )}
        {routine.badge_trending && (
          <View style={styles.badgeTrending}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.badgeTrendingText}>Trending</Text>
          </View>
        )}
        {routine.badge_new && (
          <View style={styles.badgeNew}>
            <Ionicons name="sparkles" size={14} color="#4A90E2" />
            <Text style={styles.badgeNewText}>New</Text>
          </View>
        )}
      </View>

      {/* Source Attribution - Clone & Customize feature */}
      {!compact && routine.source_routine_name && routine.source_routine_id && (
        <TouchableOpacity
          style={styles.sourceLink}
          onPress={(e) => {
            e.stopPropagation();
            router.push(`/routines/${routine.source_routine_id}`);
          }}
        >
          <Text style={styles.sourceLinkText}>
            Based on {routine.source_routine_name}
          </Text>
        </TouchableOpacity>
      )}

      {/* Description */}
      {!compact && (
        <Text style={styles.routineDescription} numberOfLines={2}>
          {routine.description}
        </Text>
      )}

      {/* Author Badge */}
      {!compact && (
        <View style={styles.authorBadgeContainer}>
          <RoutineAuthorBadge
            authorType={routine.author_type}
            officialAuthor={routine.official_author}
            creatorUsername={routine.creator_username}
            creatorAvatar={routine.creator_avatar}
            creatorName={routine.creator_name}
            size="small"
            showAvatar={true}
          />
        </View>
      )}

      {/* Footer */}
      <View style={styles.routineFooter}>
        <View style={styles.routineDetails}>
          <Text style={styles.routineDetailText}>
            {routine.duration_minutes} min • {routine.difficulty}
          </Text>
        </View>

        <View style={styles.routineMetrics}>
          {/* Completion Count */}
          <View style={styles.metric}>
            <Ionicons name="checkmark-circle-outline" size={16} color={AppColors.textTertiary} />
            <Text style={styles.metricText}>{routine.completion_count}</Text>
          </View>

          {/* Save Count */}
          <View style={styles.metric}>
            <Ionicons name="bookmark-outline" size={16} color={AppColors.textTertiary} />
            <Text style={styles.metricText}>{routine.save_count || 0}</Text>
          </View>
        </View>

        {/* Save/Public Toggle */}
        {isOwner && onTogglePublic ? (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={(e) => {
              e.stopPropagation();
              onTogglePublic();
            }}
          >
            <Ionicons
              name={routine.is_public ? 'globe' : 'lock-closed'}
              size={20}
              color={routine.is_public ? AppColors.primary : AppColors.textSecondary}
            />
          </TouchableOpacity>
        ) : onSaveToggle ? (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={(e) => {
              e.stopPropagation();
              onSaveToggle();
            }}
          >
            <Ionicons
              name={routine.is_saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={routine.is_saved ? AppColors.primary : AppColors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// =====================================================
// FILTER MODAL
// =====================================================

interface FilterModalProps {
  visible: boolean;
  filters: RoutineFilters;
  onApply: (filters: RoutineFilters) => void;
  onClose: () => void;
}

function FilterModal({ visible, filters, onApply, onClose }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<RoutineFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  const getCategoryColor = (category: RoutineCategory): string => {
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={AppColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filter Routines</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Category Filter */}
          <Text style={styles.filterSectionTitle}>Category</Text>
          <View style={styles.filterOptions}>
            {CATEGORIES.map((category) => {
              const isSelected = localFilters.category === category;
              const categoryColor = getCategoryColor(category);
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterOption,
                    isSelected && {
                      backgroundColor: categoryColor,
                      borderColor: categoryColor,
                    },
                  ]}
                  onPress={() =>
                    setLocalFilters({
                      ...localFilters,
                      category: isSelected ? undefined : category,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      isSelected && styles.filterOptionTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Difficulty Filter */}
          <Text style={styles.filterSectionTitle}>Difficulty</Text>
          <View style={styles.filterOptions}>
            {DIFFICULTIES.map((difficulty) => (
              <TouchableOpacity
                key={difficulty}
                style={[
                  styles.filterOption,
                  localFilters.difficulty === difficulty && styles.filterOptionActive,
                ]}
                onPress={() =>
                  setLocalFilters({
                    ...localFilters,
                    difficulty: localFilters.difficulty === difficulty ? undefined : difficulty,
                  })
                }
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    localFilters.difficulty === difficulty && styles.filterOptionTextActive,
                  ]}
                >
                  {difficulty}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Journey Focus Filter */}
          <Text style={styles.filterSectionTitle}>Journey Focus</Text>
          <View style={styles.filterOptions}>
            {JOURNEY_FOCUSES.map((focus) => (
              <TouchableOpacity
                key={focus}
                style={[
                  styles.filterOption,
                  localFilters.journeyFocus === focus && styles.filterOptionActive,
                ]}
                onPress={() =>
                  setLocalFilters({
                    ...localFilters,
                    journeyFocus: localFilters.journeyFocus === focus ? undefined : focus,
                  })
                }
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    localFilters.journeyFocus === focus && styles.filterOptionTextActive,
                  ]}
                >
                  {focus}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Source Filter */}
          <Text style={styles.filterSectionTitle}>Source</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                (!localFilters.source || localFilters.source === 'all') && styles.filterOptionActive,
              ]}
              onPress={() => setLocalFilters({ ...localFilters, source: 'all' })}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  (!localFilters.source || localFilters.source === 'all') &&
                    styles.filterOptionTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                localFilters.source === 'official' && styles.filterOptionActive,
              ]}
              onPress={() => setLocalFilters({ ...localFilters, source: 'official' })}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  localFilters.source === 'official' && styles.filterOptionTextActive,
                ]}
              >
                Official
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                localFilters.source === 'community' && styles.filterOptionActive,
              ]}
              onPress={() => setLocalFilters({ ...localFilters, source: 'community' })}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  localFilters.source === 'community' && styles.filterOptionTextActive,
                ]}
              >
                Community
              </Text>
            </TouchableOpacity>
          </View>

          {/* Advanced Filter (Harmony Required) */}
          <Text style={styles.filterSectionTitle}>Harmony</Text>
          <TouchableOpacity
            style={[
              styles.advancedFilterOption,
              localFilters.isAdvanced && styles.advancedFilterOptionActive,
            ]}
            onPress={() =>
              setLocalFilters({
                ...localFilters,
                isAdvanced: localFilters.isAdvanced ? undefined : true,
              })
            }
          >
            <View style={styles.advancedFilterContent}>
              <Ionicons
                name="sparkles"
                size={20}
                color={localFilters.isAdvanced ? '#FFFFFF' : '#F59E0B'}
              />
              <View style={styles.advancedFilterTextContent}>
                <Text
                  style={[
                    styles.advancedFilterLabel,
                    localFilters.isAdvanced && styles.advancedFilterLabelActive,
                  ]}
                >
                  Advanced Routines
                </Text>
                <Text
                  style={[
                    styles.advancedFilterDescription,
                    localFilters.isAdvanced && styles.advancedFilterDescriptionActive,
                  ]}
                >
                  Show only routines that require Harmony
                </Text>
              </View>
            </View>
            {localFilters.isAdvanced && (
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
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
  header: {
    padding: 24,
    paddingTop: 100,
    backgroundColor: AppColors.surface,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: AppColors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.primary,
  },
  tabContent: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textPrimary,
    padding: 0,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    paddingVertical: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  filterChipsScroll: {
    flex: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  sortChip: {
    backgroundColor: AppColors.surface,
  },
  filterChipActive: {
    backgroundColor: AppColors.lightGold,
    borderColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  filterChipTextActive: {
    color: AppColors.primary,
  },
  activeFilterChip: {
    backgroundColor: AppColors.lightGold,
    borderColor: AppColors.primary,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.primary,
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: AppColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
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
  section: {
    marginBottom: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: AppColors.lightGold,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  routineCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  routineCardCompact: {
    padding: 10,
    marginBottom: 8,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routineName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  badgePopular: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgePopularText: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTrending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeTrendingText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeNewText: {
    color: '#4A90E2',
    fontSize: 11,
    fontWeight: '600',
  },
  routineDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  sourceLink: {
    marginBottom: 6,
  },
  sourceLinkText: {
    fontSize: 12,
    color: AppColors.textTertiary,
    fontStyle: 'italic',
  },
  authorBadgeContainer: {
    marginBottom: 10,
  },
  authorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  creatorText: {
    fontSize: 12,
    color: AppColors.textTertiary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  routineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineDetails: {
    flex: 1,
  },
  routineDetailText: {
    fontSize: 13,
    color: AppColors.textTertiary,
  },
  routineMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  saveButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  filterOptionActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  filterOptionTextActive: {
    color: AppColors.textPrimary,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: AppColors.surface,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  applyButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  // Advanced filter styles for filter chips
  advancedFilterChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  advancedFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F59E0B',
  },
  // Locked routine card styles
  routineCardLocked: {
    opacity: 0.85,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  lockedIconContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.85)',
    borderRadius: 50,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  routineNameLocked: {
    color: AppColors.textSecondary,
  },
  // Advanced filter option in modal
  advancedFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  advancedFilterOptionActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  advancedFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  advancedFilterTextContent: {
    flex: 1,
  },
  advancedFilterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 2,
  },
  advancedFilterLabelActive: {
    color: '#FFFFFF',
  },
  advancedFilterDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  advancedFilterDescriptionActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Sort Modal styles
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sortModalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  sortOptionActive: {
    backgroundColor: AppColors.lightGold,
  },
  sortOptionText: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  sortOptionTextActive: {
    color: AppColors.primary,
    fontWeight: '600',
  },
});
