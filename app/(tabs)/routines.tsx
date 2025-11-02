import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRecommendedRoutines } from '@/lib/utils/dashboard';
import { Routine, RoutineCategory } from '@/types';

const CATEGORIES: RoutineCategory[] = ['Mind', 'Body', 'Soul'];

export default function RoutinesScreen() {
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RoutineCategory | 'All'>('All');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      const data = await getRecommendedRoutines(20);
      setRoutines(data);
    } catch (error) {
      console.error('Error loading routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutines = selectedCategory === 'All'
    ? routines
    : routines.filter(r => r.category === selectedCategory);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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

      {/* Filter Dropdown */}
      <View style={styles.filterSection}>
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
          <Ionicons name="chevron-down" size={20} color="#666" />
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
                <Ionicons name="checkmark" size={20} color="#007AFF" />
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
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.content}>
        {filteredRoutines.map((routine) => (
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
        ))}
      </ScrollView>
    </View>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'Mind':
      return '#9333EA';
    case 'Body':
      return '#0EA5E9';
    case 'Soul':
      return '#F59E0B';
    default:
      return '#007AFF';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 100,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#f0f0f0',
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  routineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    color: '#1a1a1a',
    flex: 1,
  },
  routineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  routineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineDetails: {
    fontSize: 12,
    color: '#999',
  },
  completionCount: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});
