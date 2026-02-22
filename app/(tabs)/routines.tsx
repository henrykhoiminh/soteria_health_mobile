import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import SanctumBackground from '@/components/Dashboard/SanctumBackground';
import HapticPressable from '@/components/HapticPressable';
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
import { useFilterOptions } from '@/lib/contexts/FilterOptionsContext';
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
    <SanctumBackground>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Routines</Text>
        <Text style={styles.subtitle}>Discover and manage your wellness practices</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <HapticPressable
          hapticStyle="selection"
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
        </HapticPressable>

        <HapticPressable
          hapticStyle="selection"
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
        </HapticPressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'discover' && user && <DiscoverTab userId={user.id} initialCategory={params.category as RoutineCategory | undefined} isInHarmony={harmonyStatus?.isInHarmony || false} />}
      {activeTab === 'my-routines' && user && <MyRoutinesTab userId={user.id} isInHarmony={harmonyStatus?.isInHarmony || false} />}
    </View>
    </SanctumBackground>
  );
}

// =====================================================
// DISCOVER TAB
// =====================================================

function DiscoverTab({ userId, initialCategory, isInHarmony }: { userId: string; initialCategory?: RoutineCategory; isInHarmony: boolean }) {
  const { upperBodyParts, lowerBodyParts } = useFilterOptions();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<RoutineSortOption>('popular');
  const [filters, setFilters] = useState<RoutineFilters>(
    initialCategory ? { category: initialCategory } : {}
  );

  // Individual dropdown modal states
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showBodyPartModal, setShowBodyPartModal] = useState(false);

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
    const wasSaved = routine.is_saved;

    // Optimistic UI update
    setRoutines(prev =>
      prev.map(r =>
        r.id === routine.id
          ? { ...r, is_saved: !wasSaved, save_count: (r.save_count || 0) + (wasSaved ? -1 : 1) }
          : r
      )
    );

    try {
      if (wasSaved) {
        await unsaveRoutine(userId, routine.id);
      } else {
        await saveRoutine(userId, routine.id);
      }
    } catch (error: any) {
      // Revert on failure
      setRoutines(prev =>
        prev.map(r =>
          r.id === routine.id
            ? { ...r, is_saved: wasSaved, save_count: (r.save_count || 0) + (wasSaved ? 1 : -1) }
            : r
        )
      );
      console.error('Error toggling save:', error);
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
            <HapticPressable onPress={() => { setSearchQuery(''); handleSearch(); }}>
              <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
            </HapticPressable>
          )}
        </View>
      </View>

      {/* Filter Dropdowns - Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScrollView}
        contentContainerStyle={styles.filtersScrollViewContent}
      >
        {/* Sort Dropdown */}
        <HapticPressable
          hapticStyle="selection"
          style={[styles.filterChip]}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={16} color={AppColors.textSecondary} />
          <Text style={styles.filterChipText}>
            {sortBy === 'popular' ? 'Popular' :
             sortBy === 'trending' ? 'Trending' :
             sortBy === 'newest' ? 'Newest' : 'Most Saved'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={AppColors.textSecondary} />
        </HapticPressable>

        {/* Category Dropdown */}
        <HapticPressable
          hapticStyle="selection"
          style={[styles.filterChip, filters.category && styles.filterChipActive]}
          onPress={() => setShowCategoryModal(true)}
        >
          <Ionicons
            name="apps-outline"
            size={16}
            color={filters.category ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.filterChipText, filters.category && styles.filterChipTextActive]}>
            {filters.category || 'All Categories'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={filters.category ? AppColors.primary : AppColors.textSecondary}
          />
        </HapticPressable>

        {/* Difficulty Dropdown */}
        <HapticPressable
          hapticStyle="selection"
          style={[styles.filterChip, filters.difficulty && styles.filterChipActive]}
          onPress={() => setShowDifficultyModal(true)}
        >
          <Ionicons
            name="speedometer-outline"
            size={16}
            color={filters.difficulty ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.filterChipText, filters.difficulty && styles.filterChipTextActive]}>
            {filters.difficulty || 'All Levels'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={filters.difficulty ? AppColors.primary : AppColors.textSecondary}
          />
        </HapticPressable>

        {/* Source Dropdown */}
        <HapticPressable
          hapticStyle="selection"
          style={[styles.filterChip, (filters.source && filters.source !== 'all') && styles.filterChipActive]}
          onPress={() => setShowSourceModal(true)}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={(filters.source && filters.source !== 'all') ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.filterChipText, (filters.source && filters.source !== 'all') && styles.filterChipTextActive]}>
            {!filters.source || filters.source === 'all' ? 'All Sources' :
             filters.source === 'official' ? 'Official' : 'Community'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={(filters.source && filters.source !== 'all') ? AppColors.primary : AppColors.textSecondary}
          />
        </HapticPressable>

        {/* Journey Focus Dropdown */}
        <HapticPressable
          hapticStyle="selection"
          style={[styles.filterChip, filters.journeyFocus && styles.filterChipActive]}
          onPress={() => setShowJourneyModal(true)}
        >
          <Ionicons
            name="compass-outline"
            size={16}
            color={filters.journeyFocus ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.filterChipText, filters.journeyFocus && styles.filterChipTextActive]}>
            {filters.journeyFocus || 'All Journeys'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={filters.journeyFocus ? AppColors.primary : AppColors.textSecondary}
          />
        </HapticPressable>

        {/* Body Part Dropdown */}
        <HapticPressable
          hapticStyle="selection"
          style={[styles.filterChip, filters.bodyPart && styles.filterChipActive]}
          onPress={() => setShowBodyPartModal(true)}
        >
          <Ionicons
            name="body-outline"
            size={16}
            color={filters.bodyPart ? AppColors.primary : AppColors.textSecondary}
          />
          <Text style={[styles.filterChipText, filters.bodyPart && styles.filterChipTextActive]}>
            {filters.bodyPart || 'All Body Parts'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={filters.bodyPart ? AppColors.primary : AppColors.textSecondary}
          />
        </HapticPressable>

        {/* Harmony Toggle */}
        <HapticPressable
          hapticStyle="selection"
          style={[styles.filterChip, filters.isAdvanced && styles.harmonyChipActive]}
          onPress={() => setFilters({ ...filters, isAdvanced: filters.isAdvanced ? undefined : true })}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={filters.isAdvanced ? '#F59E0B' : AppColors.textSecondary}
          />
          <Text style={[styles.filterChipText, filters.isAdvanced && { color: '#F59E0B', fontWeight: '600' as const }]}>
            Harmony
          </Text>
        </HapticPressable>
      </ScrollView>

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

      {/* Category Modal */}
      <FilterDropdownModal
        visible={showCategoryModal}
        title="Select Category"
        options={[
          { value: undefined, label: 'All Categories' },
          ...CATEGORIES.map(c => ({ value: c, label: c })),
        ]}
        selected={filters.category}
        onSelect={(value) => {
          setFilters({ ...filters, category: value as RoutineCategory | undefined });
          setShowCategoryModal(false);
        }}
        onClose={() => setShowCategoryModal(false)}
      />

      {/* Difficulty Modal */}
      <FilterDropdownModal
        visible={showDifficultyModal}
        title="Select Difficulty"
        options={[
          { value: undefined, label: 'All Levels' },
          ...DIFFICULTIES.map(d => ({ value: d, label: d })),
        ]}
        selected={filters.difficulty}
        onSelect={(value) => {
          setFilters({ ...filters, difficulty: value as RoutineDifficulty | undefined });
          setShowDifficultyModal(false);
        }}
        onClose={() => setShowDifficultyModal(false)}
      />

      {/* Source Modal */}
      <FilterDropdownModal
        visible={showSourceModal}
        title="Source"
        options={[
          { value: 'all', label: 'All Sources' },
          { value: 'official', label: 'Official' },
          { value: 'community', label: 'Community' },
        ]}
        selected={filters.source || 'all'}
        onSelect={(value) => {
          setFilters({ ...filters, source: value as RoutineSourceFilter });
          setShowSourceModal(false);
        }}
        onClose={() => setShowSourceModal(false)}
      />

      {/* Journey Focus Modal */}
      <FilterDropdownModal
        visible={showJourneyModal}
        title="Journey Focus"
        options={[
          { value: undefined, label: 'All Journeys' },
          ...JOURNEY_FOCUSES.map(f => ({ value: f, label: f })),
        ]}
        selected={filters.journeyFocus}
        onSelect={(value) => {
          setFilters({ ...filters, journeyFocus: value as JourneyFocus | undefined });
          setShowJourneyModal(false);
        }}
        onClose={() => setShowJourneyModal(false)}
      />

      {/* Body Part Modal */}
      <Modal
        visible={showBodyPartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBodyPartModal(false)}
      >
        <HapticPressable
          hapticStyle="none"
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowBodyPartModal(false)}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>Select Body Part</Text>
            <ScrollView>
              {/* All option */}
              <HapticPressable
                style={[
                  styles.dropdownOption,
                  !filters.bodyPart && styles.dropdownOptionActive,
                ]}
                hapticStyle="selection"
                onPress={() => {
                  setFilters({ ...filters, bodyPart: undefined });
                  setShowBodyPartModal(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    !filters.bodyPart && styles.dropdownOptionTextActive,
                  ]}
                >
                  All Body Parts
                </Text>
                {!filters.bodyPart && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </HapticPressable>

              {/* Upper Body Section */}
              <Text style={styles.dropdownSectionHeader}>Upper Body</Text>
              {upperBodyParts.map((bodyPart) => (
                <HapticPressable
                  key={bodyPart}
                  style={[
                    styles.dropdownOption,
                    filters.bodyPart === bodyPart && styles.dropdownOptionActive,
                  ]}
                  hapticStyle="selection"
                  onPress={() => {
                    setFilters({ ...filters, bodyPart });
                    setShowBodyPartModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      filters.bodyPart === bodyPart && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {bodyPart}
                  </Text>
                  {filters.bodyPart === bodyPart && (
                    <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                  )}
                </HapticPressable>
              ))}

              {/* Lower Body Section */}
              <Text style={styles.dropdownSectionHeader}>Lower Body</Text>
              {lowerBodyParts.map((bodyPart) => (
                <HapticPressable
                  key={bodyPart}
                  style={[
                    styles.dropdownOption,
                    filters.bodyPart === bodyPart && styles.dropdownOptionActive,
                  ]}
                  hapticStyle="selection"
                  onPress={() => {
                    setFilters({ ...filters, bodyPart });
                    setShowBodyPartModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      filters.bodyPart === bodyPart && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {bodyPart}
                  </Text>
                  {filters.bodyPart === bodyPart && (
                    <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                  )}
                </HapticPressable>
              ))}
            </ScrollView>
          </View>
        </HapticPressable>
      </Modal>
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
      <HapticPressable
        hapticStyle="none"
        style={styles.sortModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sortModalContent}>
          <Text style={styles.sortModalTitle}>Sort By</Text>
          {SORT_OPTIONS.map((option) => (
            <HapticPressable
              hapticStyle="selection"
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
            </HapticPressable>
          ))}
        </View>
      </HapticPressable>
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
    // Optimistic UI update - remove from saved list
    const removedRoutine = savedRoutines.find(r => r.id === routineId);
    setSavedRoutines(prev => prev.filter(r => r.id !== routineId));

    try {
      await unsaveRoutine(userId, routineId);
    } catch (error) {
      // Revert on failure
      if (removedRoutine) {
        setSavedRoutines(prev => [...prev, removedRoutine]);
      }
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
          <HapticPressable
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/builder')}
          >
            <Ionicons name="add-circle" size={20} color={AppColors.primary} />
            <Text style={styles.createButtonText}>Create</Text>
          </HapticPressable>
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
    <HapticPressable
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
        <HapticPressable
          style={styles.sourceLink}
          onPress={(e) => {
            e.stopPropagation();
            router.push(`/routines/${routine.source_routine_id}`);
          }}
        >
          <Text style={styles.sourceLinkText}>
            Based on {routine.source_routine_name}
          </Text>
        </HapticPressable>
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
          <HapticPressable
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
          </HapticPressable>
        ) : onSaveToggle ? (
          <HapticPressable
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
          </HapticPressable>
        ) : null}
      </View>
    </HapticPressable>
  );
}

// =====================================================
// FILTER DROPDOWN MODAL (Reusable)
// =====================================================

interface FilterDropdownOption {
  value: string | undefined;
  label: string;
}

interface FilterDropdownModalProps {
  visible: boolean;
  title: string;
  options: FilterDropdownOption[];
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
  onClose: () => void;
}

function FilterDropdownModal({ visible, title, options, selected, onSelect, onClose }: FilterDropdownModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <HapticPressable
        hapticStyle="none"
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <ScrollView>
            {options.map((option) => (
              <HapticPressable
                key={option.value || 'all'}
                style={[
                  styles.dropdownOption,
                  selected === option.value && styles.dropdownOptionActive,
                ]}
                hapticStyle="selection"
                onPress={() => onSelect(option.value)}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    selected === option.value && styles.dropdownOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {selected === option.value && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </HapticPressable>
            ))}
          </ScrollView>
        </View>
      </HapticPressable>
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
    backgroundColor: 'transparent',
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
    backgroundColor: AppColors.glassBackground,
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
    backgroundColor: AppColors.glassBackground,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.glassEdge,
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
    backgroundColor: AppColors.glassBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.glassEdge,
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
  filtersScrollView: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: AppColors.glassBackground,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.glassEdge,
    minHeight: 52,
  },
  filtersScrollViewContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    flexGrow: 0,
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  filterChipActive: {
    backgroundColor: AppColors.lightGold,
    borderColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: AppColors.textSecondary,
    flexShrink: 0,
    lineHeight: 18,
  },
  filterChipTextActive: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  harmonyChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
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
    backgroundColor: AppColors.glassBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
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
  // Dropdown modal styles (shared by filter dropdowns)
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownContent: {
    backgroundColor: AppColors.glassBackground,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    maxHeight: '50%',
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: AppColors.primary + '15',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  dropdownOptionTextActive: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  dropdownSectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: AppColors.glassBackground,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: AppColors.glassEdge,
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
