import { useAuth } from '@/lib/contexts/AuthContext';
import { AppColors } from '@/constants/theme';
import {
  searchCircleRoutines,
  addRoutineToCircle,
  removeRoutineFromCircle,
  getAvailableRoutinesForCircle,
} from '@/lib/utils/social';
import { saveRoutine, unsaveRoutine } from '@/lib/utils/routine-discovery';
import { Routine } from '@/types';
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
import HapticPressable from '@/components/HapticPressable';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RoutineCard from '@/components/RoutineCard';

interface EnhancedCircleRoutinesTabProps {
  circleId: string;
  isAdmin: boolean;
  onRefresh?: () => void;
  onSetRoutineOfTheDay?: (routineId: string, routineName: string) => void;
}

export default function EnhancedCircleRoutinesTab({
  circleId,
  isAdmin,
  onRefresh,
  onSetRoutineOfTheDay,
}: EnhancedCircleRoutinesTabProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [routines, setRoutines] = useState<{ routine: Routine; circle_routine_id: string }[]>([]);
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
        sortBy,
        user?.id
      );
      setRoutines(data);
    } catch (error) {
      console.error('Error loading circle routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToggle = async (routine: Routine) => {
    if (!user) return;
    const wasSaved = routine.is_saved;

    // Optimistic UI update
    setRoutines(prev =>
      prev.map(item =>
        item.routine.id === routine.id
          ? { ...item, routine: { ...item.routine, is_saved: !wasSaved, save_count: (item.routine.save_count || 0) + (wasSaved ? -1 : 1) } }
          : item
      )
    );

    try {
      if (wasSaved) {
        await unsaveRoutine(user.id, routine.id);
      } else {
        await saveRoutine(user.id, routine.id);
      }
    } catch (error: any) {
      // Revert on failure
      setRoutines(prev =>
        prev.map(item =>
          item.routine.id === routine.id
            ? { ...item, routine: { ...item.routine, is_saved: wasSaved, save_count: (item.routine.save_count || 0) + (wasSaved ? 1 : -1) } }
            : item
        )
      );
      console.error('Error toggling save:', error);
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
              await loadRoutines();
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: { routine: Routine; circle_routine_id: string }
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <HapticPressable
        style={styles.swipeDeleteButton}
        hapticStyle="medium"
        onPress={() => handleRemoveRoutine(item.circle_routine_id, item.routine.name)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </Animated.View>
      </HapticPressable>
    );
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
            <HapticPressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={AppColors.textSecondary} />
            </HapticPressable>
          )}
        </View>
        <HapticPressable
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={24} color={AppColors.primary} />
        </HapticPressable>
      </View>

      {/* Add Routine Button (Members) */}
      <HapticPressable
        style={styles.addRoutineButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add-circle" size={20} color={AppColors.primary} />
        <Text style={styles.addRoutineButtonText}>Add Routine to Circle</Text>
      </HapticPressable>

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
          {routines.map((item) => {
            const card = (
              <RoutineCard
                key={item.circle_routine_id}
                routine={item.routine}
                onPress={() => router.push(`/routines/${item.routine.id}?circleId=${circleId}`)}
                onSaveToggle={() => handleSaveToggle(item.routine)}
              />
            );

            if (isAdmin) {
              return (
                <View key={item.circle_routine_id} style={styles.routineCardWrapper}>
                  <Swipeable
                    renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                    overshootRight={false}
                  >
                    {card}
                  </Swipeable>
                  {onSetRoutineOfTheDay && (
                    <HapticPressable
                      style={styles.rotdIconOverlay}
                      onPress={() => onSetRoutineOfTheDay(item.routine.id, item.routine.name)}
                      hapticStyle="selection"
                    >
                      <Ionicons name="add-circle" size={26} color="#F59E0B" />
                    </HapticPressable>
                  )}
                </View>
              );
            }

            return card;
          })}
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
            <HapticPressable onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </HapticPressable>
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
                  <HapticPressable
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
                  </HapticPressable>
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
            <HapticPressable onPress={onClose}>
              <Ionicons name="close" size={28} color={AppColors.textPrimary} />
            </HapticPressable>
          </View>

          <ScrollView style={styles.filterModalBody}>
            {/* Category Filter */}
            <Text style={styles.filterSectionTitle}>Category</Text>
            <View style={styles.categoryButtons}>
              {categories.map((category) => (
                <HapticPressable
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive,
                  ]}
                  hapticStyle="selection"
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
                </HapticPressable>
              ))}
            </View>

            {/* Sort Options */}
            <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Sort By</Text>
            {sortOptions.map((option) => (
              <HapticPressable
                key={option.value}
                style={styles.sortOption}
                hapticStyle="selection"
                onPress={() => onSortChange(option.value)}
              >
                <Text style={styles.sortOptionText}>{option.label}</Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={AppColors.primary} />
                )}
              </HapticPressable>
            ))}
          </ScrollView>

          <HapticPressable style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </HapticPressable>
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
  swipeDeleteButton: {
    backgroundColor: AppColors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
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
    color: AppColors.primaryText,
  },
  routineCardWrapper: {
    position: 'relative',
  },
  rotdIconOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
