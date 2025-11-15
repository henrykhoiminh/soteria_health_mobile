import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import {
  getUserMilestones,
  getMilestoneStats,
  groupMilestonesByCategory,
  getCategoryLabel,
  getCategoryIcon,
  getAchievedMilestones,
  getInProgressMilestones,
  getUpcomingMilestones,
} from '@/lib/utils/milestones';
import { MilestoneSummary, MilestoneCategory } from '@/types';
import MilestoneCard from '@/components/MilestoneCard';

type FilterType = 'all' | 'achieved' | 'in-progress' | 'upcoming';
type CategoryFilter = 'all' | MilestoneCategory;

export default function ProgressScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneSummary[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Load milestones data
  const loadMilestones = async () => {
    if (!user) return;

    try {
      const data = await getUserMilestones(user.id);
      setMilestones(data);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMilestones();
    }, [user])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadMilestones();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  // Filter milestones based on selected filters
  let filteredMilestones = milestones;

  // Apply status filter
  switch (filter) {
    case 'achieved':
      filteredMilestones = getAchievedMilestones(filteredMilestones);
      break;
    case 'in-progress':
      filteredMilestones = getInProgressMilestones(filteredMilestones);
      break;
    case 'upcoming':
      filteredMilestones = getUpcomingMilestones(filteredMilestones);
      break;
  }

  // Apply category filter
  if (categoryFilter !== 'all') {
    filteredMilestones = filteredMilestones.filter(
      (m) => m.category === categoryFilter
    );
  }

  // Get stats
  const stats = getMilestoneStats(milestones);

  // Group by category for display
  const categories: MilestoneCategory[] = [
    'streak',
    'completion',
    'balance',
    'specialization',
    'pain',
    'journey',
    'social',
    'consistency',
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Milestones</Text>
        <Text style={styles.subtitle}>Track your achievements and progress</Text>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.achieved}</Text>
          <Text style={styles.statLabel}>Achieved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completionPercentage}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter by Status</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <FilterButton
            label="All"
            count={milestones.length}
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterButton
            label="Achieved"
            count={stats.achieved}
            active={filter === 'achieved'}
            onPress={() => setFilter('achieved')}
          />
          <FilterButton
            label="In Progress"
            count={stats.inProgress}
            active={filter === 'in-progress'}
            onPress={() => setFilter('in-progress')}
          />
          <FilterButton
            label="Upcoming"
            count={stats.upcoming}
            active={filter === 'upcoming'}
            onPress={() => setFilter('upcoming')}
          />
        </ScrollView>
      </View>

      {/* Category Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter by Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <CategoryFilterButton
            label="All"
            icon="grid"
            active={categoryFilter === 'all'}
            onPress={() => setCategoryFilter('all')}
          />
          {categories.map((category) => (
            <CategoryFilterButton
              key={category}
              label={getCategoryLabel(category)}
              icon={getCategoryIcon(category)}
              active={categoryFilter === category}
              onPress={() => setCategoryFilter(category)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Milestones List */}
      <View style={styles.milestonesSection}>
        {filteredMilestones.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={AppColors.textTertiary} />
            <Text style={styles.emptyText}>No milestones found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or keep working towards your goals!
            </Text>
          </View>
        ) : (
          filteredMilestones.map((milestone) => (
            <MilestoneCard key={milestone.milestone_id} milestone={milestone} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function FilterButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
        {label}
      </Text>
      <View
        style={[
          styles.filterBadge,
          active && styles.filterBadgeActive,
        ]}
      >
        <Text
          style={[
            styles.filterBadgeText,
            active && styles.filterBadgeTextActive,
          ]}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CategoryFilterButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.categoryButton, active && styles.categoryButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={active ? AppColors.textPrimary : AppColors.textSecondary}
      />
      <Text
        style={[
          styles.categoryButtonText,
          active && styles.categoryButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

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
    fontSize: 32,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    backgroundColor: AppColors.surface,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  filterSection: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    marginRight: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  filterButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  filterButtonTextActive: {
    color: AppColors.textPrimary,
  },
  filterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 10,
  },
  filterBadgeActive: {
    backgroundColor: AppColors.background,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: AppColors.textTertiary,
  },
  filterBadgeTextActive: {
    color: AppColors.textPrimary,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  categoryButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  categoryButtonTextActive: {
    color: AppColors.textPrimary,
  },
  milestonesSection: {
    padding: 24,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
});
