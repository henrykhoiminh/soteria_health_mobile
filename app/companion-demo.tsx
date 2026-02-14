import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import HapticPressable from '@/components/HapticPressable';
import CompanionAvatar, { Category, LightState } from '@/components/CompanionAvatar';

const LIGHT_STATES: LightState[] = ['Dormant', 'Sleepy', 'Awakening', 'Glowing', 'Radiant'];
const CATEGORIES: Category[] = ['Mind', 'Body', 'Soul'];

export default function CompanionDemoScreen() {
  const [mindState, setMindState] = useState<LightState>('Glowing');
  const [bodyState, setBodyState] = useState<LightState>('Awakening');
  const [soulState, setSoulState] = useState<LightState>('Sleepy');

  const getStateForCategory = (category: Category): LightState => {
    switch (category) {
      case 'Mind':
        return mindState;
      case 'Body':
        return bodyState;
      case 'Soul':
        return soulState;
    }
  };

  const setStateForCategory = (category: Category, state: LightState) => {
    switch (category) {
      case 'Mind':
        setMindState(state);
        break;
      case 'Body':
        setBodyState(state);
        break;
      case 'Soul':
        setSoulState(state);
        break;
    }
  };

  const cycleState = (category: Category) => {
    const currentState = getStateForCategory(category);
    const currentIndex = LIGHT_STATES.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % LIGHT_STATES.length;
    setStateForCategory(category, LIGHT_STATES[nextIndex]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Companion Demo',
          headerStyle: { backgroundColor: AppColors.background },
          headerTintColor: AppColors.textPrimary,
          headerLeft: () => (
            <HapticPressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
            </HapticPressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Companion Avatar Test</Text>
        <Text style={styles.subtitle}>
          Tap each companion to cycle through light states.
          {'\n'}This is the fallback UI until .riv files are created.
        </Text>

        {/* Main Companions Row */}
        <View style={styles.companionsRow}>
          {CATEGORIES.map((category) => (
            <View key={category} style={styles.companionColumn}>
              <CompanionAvatar
                category={category}
                lightState={getStateForCategory(category)}
                size={100}
                onPress={() => cycleState(category)}
              />
              <Text style={styles.companionName}>{category}</Text>
              <Text style={styles.companionState}>{getStateForCategory(category)}</Text>
            </View>
          ))}
        </View>

        {/* State Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Light State Controls</Text>

          {CATEGORIES.map((category) => (
            <View key={category} style={styles.controlRow}>
              <Text style={styles.controlLabel}>{category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.stateButtons}>
                  {LIGHT_STATES.map((state) => (
                    <HapticPressable
                      key={state}
                      style={[
                        styles.stateButton,
                        getStateForCategory(category) === state && styles.stateButtonActive,
                      ]}
                      onPress={() => setStateForCategory(category, state)}
                    >
                      <Text
                        style={[
                          styles.stateButtonText,
                          getStateForCategory(category) === state && styles.stateButtonTextActive,
                        ]}
                      >
                        {state}
                      </Text>
                    </HapticPressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}
        </View>

        {/* Size Variations */}
        <View style={styles.sizeSection}>
          <Text style={styles.sectionTitle}>Size Variations</Text>
          <View style={styles.sizeRow}>
            <View style={styles.sizeItem}>
              <CompanionAvatar category="Mind" lightState="Glowing" size={40} />
              <Text style={styles.sizeLabel}>40px</Text>
            </View>
            <View style={styles.sizeItem}>
              <CompanionAvatar category="Body" lightState="Glowing" size={60} />
              <Text style={styles.sizeLabel}>60px</Text>
            </View>
            <View style={styles.sizeItem}>
              <CompanionAvatar category="Soul" lightState="Glowing" size={80} />
              <Text style={styles.sizeLabel}>80px</Text>
            </View>
            <View style={styles.sizeItem}>
              <CompanionAvatar category="Mind" lightState="Radiant" size={120} />
              <Text style={styles.sizeLabel}>120px</Text>
            </View>
          </View>
        </View>

        {/* All States Grid */}
        <View style={styles.gridSection}>
          <Text style={styles.sectionTitle}>All States Grid</Text>
          <View style={styles.grid}>
            {CATEGORIES.map((category) => (
              <View key={category} style={styles.gridRow}>
                <Text style={styles.gridRowLabel}>{category}</Text>
                {LIGHT_STATES.map((state) => (
                  <View key={state} style={styles.gridCell}>
                    <CompanionAvatar
                      category={category}
                      lightState={state}
                      size={50}
                    />
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.gridLabels}>
              <Text style={styles.gridLabelPlaceholder}></Text>
              {LIGHT_STATES.map((state) => (
                <Text key={state} style={styles.gridLabel}>
                  {state.substring(0, 3)}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Integration Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Integration Notes</Text>
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Current Status: Fallback Mode</Text>
            <Text style={styles.noteText}>
              The companions are currently using the animated fallback UI with icons.
              Once you create .riv files and place them in assets/rive/, the component
              will automatically switch to using Rive animations.
            </Text>
          </View>
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Required Rive Files</Text>
            <Text style={styles.noteText}>
              • assets/rive/companion_mind.riv{'\n'}
              • assets/rive/companion_body.riv{'\n'}
              • assets/rive/companion_soul.riv{'\n'}
              {'\n'}
              Each file should have a state machine named "CompanionState" with:{'\n'}
              • Input: lightLevel (Number 0-4){'\n'}
              • Trigger: userTapped
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  companionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  companionColumn: {
    alignItems: 'center',
  },
  companionName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginTop: 12,
  },
  companionState: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  controlsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  controlRow: {
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  stateButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  stateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  stateButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  stateButtonText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  stateButtonTextActive: {
    color: AppColors.primaryText,
    fontWeight: '600',
  },
  sizeSection: {
    marginBottom: 32,
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  sizeItem: {
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
  gridSection: {
    marginBottom: 32,
  },
  grid: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridRowLabel: {
    width: 50,
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
  },
  gridLabels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  gridLabelPlaceholder: {
    width: 50,
  },
  gridLabel: {
    flex: 1,
    fontSize: 10,
    color: AppColors.textTertiary,
    textAlign: 'center',
  },
  notesSection: {
    marginBottom: 20,
  },
  noteCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
});
