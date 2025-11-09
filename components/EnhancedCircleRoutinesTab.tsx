import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import {
  searchCircleRoutines,
  addRoutineToCircle,
  removeRoutineFromCircle,
  getAvailableRoutinesForCircle,
} from '@/lib/utils/social';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface EnhancedCircleRoutinesTabProps {
  circleId: string;
  isAdmin: boolean;
  onRefresh?: () => void;
}

export default function EnhancedCircleRoutinesTab({
  circleId,
  isAdmin,
  onRefresh,
}: EnhancedCircleRoutinesTabProps) {
  const router = useRouter();

  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'name'>('recent');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    loadRoutines();
  }, [circleId, searchQuery, selectedCategory, sortBy]);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      const data = await searchCircleRoutines(
        circleId,
        searchQuery,
        selectedCategory === 'All' ? undefined : selectedCategory,
        sortBy
      );
      setRoutines(data);
    } catch (error) {
      console.error('Error loading circle routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRoutine = (circleRoutineId: string, routineName: string) => {
    Alert.alert(
      'Remove Routine',
      `Remove "${routineName}" from this circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistically remove from UI
              setRoutines(prev => prev.filter(r => r.circle_routine_id !== circleRoutineId));

              // Delete from database
              await removeRoutineFromCircle(circleRoutineId);

              // Refresh to ensure consistency
              await loadRoutines();
              if (onRefresh) onRefresh();
            } catch (error: any) {
              console.error('Error removing routine:', error);
              Alert.alert('Error', error.message || 'Failed to remove routine');
              // Reload on error to restore state
              await loadRoutines();
            }
          },
        },
      ]
    );
  };

  const getCategoryColor = (category: string): string => {
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

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: any
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.swipeDeleteButton}
        onPress={() => handleRemoveRoutine(item.circle_routine_id, item.routine_name)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderRoutineCard = ({ item }: { item: any }) => {
    const cardContent = (
      <TouchableOpacity
        style={styles.routineCard}
        onPress={() => router.push(`/routines/${item.routine_id}?circleId=${circleId}`)}
      >
        {/* Popular Flame Badge - Top Right Corner */}
        {item.is_popular && (
          <View style={styles.popularBadge}>
            <Ionicons name="flame" size={16} color="#FF6B35" />
            <Text style={styles.popularText}>Popular</Text>
          </View>
        )}

        {/* Routine Header - Category Dot + Name */}
        <View style={styles.routineHeader}>
          <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(item.category) }]} />
          <Text style={styles.routineName}>{item.routine_name}</Text>
        </View>

        {/* Routine Description */}
        <Text style={styles.routineDescription} numberOfLines={2}>
          {item.routine_description}
        </Text>

        {/* Routine Footer - Duration/Difficulty + Completion Stats */}
        <View style={styles.routineFooter}>
          <Text style={styles.routineDetails}>
            {item.duration_minutes} min • {item.difficulty}
          </Text>
          <Text style={styles.completionCount}>
            {item.completion_count || 0} {item.completion_count === 1 ? 'completion' : 'completions'}
          </Text>
        </View>
      </TouchableOpacity>
    );

    // Only wrap in Swipeable if user is admin
    if (isAdmin) {
      return (
        <Swipeable
          renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
          overshootRight={false}
        >
          {cardContent}
        </Swipeable>
      );
    }

    return cardContent;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={AppColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search routines..."
            placeholderTextColor={AppColors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={24} color={AppColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Add Routine Button (Members) */}
      <TouchableOpacity
        style={styles.addRoutineButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add-circle" size={20} color={AppColors.primary} />
        <Text style={styles.addRoutineButtonText}>Add Routine to Circle</Text>
      </TouchableOpacity>

      {/* Routines List */}
      {routines.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={48} color={AppColors.textTertiary} />
          <Text style={styles.emptyText}>No routines found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search' : 'Add routines to get started'}
          </Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {routines.map((item) => (
            <View key={item.circle_routine_id}>
              {renderRoutineCard({ item })}
            </View>
          ))}
        </View>
      )}

      {/* Add Routine Modal */}
      <AddRoutineModal
        visible={showAddModal}
        circleId={circleId}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadRoutines();
          if (onRefresh) onRefresh();
        }}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        selectedCategory={selectedCategory}
        sortBy={sortBy}
        onCategoryChange={setSelectedCategory}
        onSortChange={setSortBy}
        onClose={() => setShowFilterModal(false)}
      />
    </GestureHandlerRootView>
  );
}

// =====================================================
// ADD ROUTINE MODAL
// =====================================================

interface AddRoutineModalProps {
  visible: boolean;
  circleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddRoutineModal({ visible, circleId, onClose, onSuccess }: AddRoutineModalProps) {
  const { user } = useAuth();
  const [availableRoutines, setAvailableRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      loadAvailableRoutines();
    }
  }, [visible]);

  const loadAvailableRoutines = async () => {
    try {
      setLoading(true);
      const data = await getAvailableRoutinesForCircle(circleId);
      setAvailableRoutines(data);
    } catch (error) {
      console.error('Error loading available routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoutine = async (routineId: string, routineName: string) => {
    if (!user) return;

    try {
      await addRoutineToCircle(circleId, routineId, user.id);
      Alert.alert('Success', `${routineName} added to circle!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add routine');
    }
  };

  const filteredRoutines = availableRoutines.filter(routine =>
    routine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    routine.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string): string => {
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Routine</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.modalSearchContainer}>
            <Ionicons name="search" size={20} color={AppColors.textSecondary} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search available routines..."
              placeholderTextColor={AppColors.textPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {loading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
          ) : filteredRoutines.length === 0 ? (
            <View style={styles.modalEmptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={AppColors.textTertiary} />
              <Text style={styles.modalEmptyText}>
                {searchQuery ? 'No routines found' : 'All routines already added!'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ padding: 16, paddingBottom: 32 }}>
                {filteredRoutines.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.availableRoutineCard}
                    onPress={() => handleAddRoutine(item.id, item.name)}
                  >
                    <View style={styles.availableRoutineHeader}>
                      <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(item.category) }]} />
                      <Text style={styles.availableRoutineName}>{item.name}</Text>
                    </View>
                    <Text style={styles.availableRoutineDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={styles.availableRoutineFooter}>
                      <Text style={styles.availableRoutineDuration}>
                        {item.duration_minutes} min • {item.difficulty}
                      </Text>
                      <Ionicons name="add-circle" size={24} color={AppColors.primary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =====================================================
// FILTER MODAL
// =====================================================

interface FilterModalProps {
  visible: boolean;
  selectedCategory: string;
  sortBy: 'popular' | 'recent' | 'name';
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: 'popular' | 'recent' | 'name') => void;
  onClose: () => void;
}

function FilterModal({
  visible,
  selectedCategory,
  sortBy,
  onCategoryChange,
  onSortChange,
  onClose,
}: FilterModalProps) {
  const categories = ['All', 'Mind', 'Body', 'Soul'];
  const sortOptions: Array<{ value: 'popular' | 'recent' | 'name'; label: string }> = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'recent', label: 'Recently Added' },
    { value: 'name', label: 'Name (A-Z)' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalBody}>
            {/* Category Filter */}
            <Text style={styles.filterSectionTitle}>Category</Text>
            <View style={styles.categoryButtons}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive,
                  ]}
                  onPress={() => onCategoryChange(category)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === category && styles.categoryButtonTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Options */}
            <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Sort By</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => onSortChange(option.value)}
              >
                <Text style={styles.sortOptionText}>{option.label}</Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={AppColors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  searchBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: AppColors.textPrimary,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
  },
  addRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: AppColors.primary,
    gap: 8,
  },
  addRoutineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
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
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  popularText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
  },
  swipeDeleteButton: {
    backgroundColor: AppColors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
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
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
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
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    color: AppColors.textPrimary,
    fontSize: 16,
  },
  modalLoadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  modalEmptyState: {
    padding: 48,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    color: AppColors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  modalScrollView: {
    flex: 1,
  },
  availableRoutineCard: {
    backgroundColor: AppColors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  availableRoutineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  availableRoutineName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    flex: 1,
  },
  availableRoutineDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  availableRoutineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availableRoutineDuration: {
    fontSize: 12,
    color: AppColors.textTertiary,
  },
  filterModalContent: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  filterModalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  categoryButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  categoryButtonTextActive: {
    color: AppColors.textPrimary,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  sortOptionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  applyButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
});
