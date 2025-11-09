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
  FlatList,
} from 'react-native';
import { AppColors } from '@/constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRecommendedRoutines, getUserCustomRoutines, searchRoutinesByName } from '@/lib/utils/dashboard';
import { Routine, RoutineCategory } from '@/types';
import { useAuth } from '@/lib/contexts/AuthContext';

const CATEGORIES: RoutineCategory[] = ['Mind', 'Body', 'Soul'];

type RoutineFilter = 'all' | 'custom';

export default function RoutinesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RoutineCategory | 'All'>('All');
  const [selectedFilter, setSelectedFilter] = useState<RoutineFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();

  useEffect(() => {
    loadRoutines();
  }, [selectedFilter, searchQuery, selectedCategory]);

  useEffect(() => {
    // Apply category filter from navigation params
    if (category && (category === 'Mind' || category === 'Body' || category === 'Soul')) {
      setSelectedCategory(category as RoutineCategory);
    }
  }, [category]);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      let data: Routine[];

      // Search by name and description if there's a search query
      if (searchQuery.trim()) {
        const isCustom = selectedFilter === 'custom' ? true : undefined;
        data = await searchRoutinesByName(
          searchQuery,
          selectedCategory,
          isCustom,
          user?.id
        );
      } else if (selectedFilter === 'custom' && user) {
        data = await getUserCustomRoutines(user.id);
      } else {
        data = await getRecommendedRoutines(50);
      }

      setRoutines(data);
    } catch (error) {
      console.error('Error loading routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutines = routines.filter(routine => {
    // When using search, routines are already filtered by the search function
    if (searchQuery.trim()) {
      return true;
    }

    // Filter by category only when not searching
    return selectedCategory === 'All' || routine.category === selectedCategory;
  });


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  const handleSelectCategory = (category: RoutineCategory | 'All') => {
    setSelectedCategory(category);
    setDropdownVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Routines</Text>
        <Text style={styles.subtitle}>Choose your wellness practice</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterChipsContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedFilter('all')}
        >
          <Ionicons
            name="list"
            size={16}
            color={selectedFilter === 'all' ? AppColors.textPrimary : AppColors.textSecondary}
          />
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === 'all' && styles.filterChipTextActive,
            ]}
          >
            All Routines
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedFilter === 'custom' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedFilter('custom')}
        >
          <Ionicons
            name="create"
            size={16}
            color={selectedFilter === 'custom' ? AppColors.textPrimary : AppColors.textSecondary}
          />
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === 'custom' && styles.filterChipTextActive,
            ]}
          >
            My Routines
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.filterSection}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={AppColors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search routines..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={AppColors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter Dropdown */}
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setDropdownVisible(true)}
        >
          <View style={styles.dropdownContent}>
            {selectedCategory !== 'All' && (
              <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(selectedCategory) }]} />
            )}
            <Text style={styles.dropdownText}>
              {selectedCategory === 'All' ? 'All Routines' : selectedCategory}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleSelectCategory('All')}
            >
              <Text style={[styles.modalOptionText, selectedCategory === 'All' && styles.modalOptionTextActive]}>
                All Routines
              </Text>
              {selectedCategory === 'All' && (
                <Ionicons name="checkmark" size={20} color={AppColors.primary} />
              )}
            </TouchableOpacity>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.modalOption}
                onPress={() => handleSelectCategory(category)}
              >
                <View style={styles.modalOptionContent}>
                  <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(category) }]} />
                  <Text style={[styles.modalOptionText, selectedCategory === category && styles.modalOptionTextActive]}>
                    {category}
                  </Text>
                </View>
                {selectedCategory === category && (
                  <Ionicons name="checkmark" size={20} color={AppColors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.content}>
        {filteredRoutines.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={AppColors.border} />
            <Text style={styles.emptyStateTitle}>
              {selectedFilter === 'custom' ? 'No custom routines yet' : 'No routines found'}
            </Text>
            <Text style={styles.emptyStateText}>
              {selectedFilter === 'custom'
                ? 'Create your first custom routine using the Builder tab'
                : 'Try adjusting your filters or search query'}
            </Text>
          </View>
        ) : (
          filteredRoutines.map((routine) => (
            <TouchableOpacity
              key={routine.id}
              style={styles.routineCard}
              onPress={() => router.push(`/routines/${routine.id}`)}
            >
              <View style={styles.routineHeader}>
                <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(routine.category) }]} />
                <Text style={styles.routineName}>{routine.name}</Text>
              </View>
              <Text style={styles.routineDescription} numberOfLines={2}>
                {routine.description}
              </Text>
              <View style={styles.routineFooter}>
                <Text style={styles.routineDetails}>
                  {routine.duration_minutes} min • {routine.difficulty}
                </Text>
                <Text style={styles.completionCount}>
                  {routine.completion_count} completions
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

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
  filterChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  filterChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  filterChipTextActive: {
    color: AppColors.textPrimary,
  },
  filterSection: {
    backgroundColor: AppColors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: AppColors.textPrimary,
    fontWeight: '500',
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
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  modalOptionTextActive: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  routineCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  routineDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 12,
  },
  routineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineDetails: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  completionCount: {
    fontSize: 12,
    color: AppColors.primary,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
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
});
