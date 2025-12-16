/**
 * SoteriaCharacter - Interactive animated character for Soteria Health
 *
 * This component wraps a Rive animation with state machine controls.
 *
 * SETUP REQUIRED:
 * 1. Install rive-react-native: npm install rive-react-native
 * 2. Create soteria_character_core.riv in Rive Editor
 * 3. Place .riv file in assets/animations/characters/
 *
 * See: assets/animations/SOTERIA_CHARACTER_PLAN.md for full guide
 */

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
// import Rive, { RiveRef } from 'rive-react-native'; // Uncomment when installed
import { RoutineCategory } from '@/types';
import { AppColors } from '@/constants/theme';

interface SoteriaCharacterProps {
  size?: number;
  category?: RoutineCategory;
  isActive?: boolean;
  style?: ViewStyle;
}

export interface SoteriaCharacterHandle {
  triggerCelebration: () => void;
  triggerMajorCelebration: () => void;
  goDormant: () => void;
  wakeUp: () => void;
  startRoutine: () => void;
  endRoutine: () => void;
  setCategory: (category: RoutineCategory) => void;
  setEnergy: (level: number) => void;
}

const SoteriaCharacter = forwardRef<SoteriaCharacterHandle, SoteriaCharacterProps>(
  ({ size = 200, category = 'Mind', isActive = false, style }, ref) => {
    // Uncomment when rive-react-native is installed:
    // const riveRef = useRef<RiveRef>(null);

    const categoryValue = category === 'Mind' ? 0 : category === 'Body' ? 1 : 2;
    const categoryColor = category === 'Mind'
      ? AppColors.categoryMind
      : category === 'Body'
        ? AppColors.categoryBody
        : AppColors.categorySoul;

    useImperativeHandle(ref, () => ({
      triggerCelebration: () => {
        // riveRef.current?.fireState('MainCharacter', 'routine_complete');
        console.log('[SoteriaCharacter] triggerCelebration');
      },
      triggerMajorCelebration: () => {
        // riveRef.current?.fireState('MainCharacter', 'celebrate');
        console.log('[SoteriaCharacter] triggerMajorCelebration');
      },
      goDormant: () => {
        // riveRef.current?.fireState('MainCharacter', 'go_dormant');
        console.log('[SoteriaCharacter] goDormant');
      },
      wakeUp: () => {
        // riveRef.current?.fireState('MainCharacter', 'wake_up');
        console.log('[SoteriaCharacter] wakeUp');
      },
      startRoutine: () => {
        // riveRef.current?.fireState('MainCharacter', 'routine_start');
        // riveRef.current?.setInputState('MainCharacter', 'is_active', true);
        console.log('[SoteriaCharacter] startRoutine');
      },
      endRoutine: () => {
        // riveRef.current?.setInputState('MainCharacter', 'is_active', false);
        console.log('[SoteriaCharacter] endRoutine');
      },
      setCategory: (cat: RoutineCategory) => {
        const value = cat === 'Mind' ? 0 : cat === 'Body' ? 1 : 2;
        // riveRef.current?.setInputState('MainCharacter', 'category_focus', value);
        console.log('[SoteriaCharacter] setCategory:', cat, value);
      },
      setEnergy: (level: number) => {
        const clampedLevel = Math.max(0, Math.min(100, level));
        // riveRef.current?.setInputState('MainCharacter', 'energy_level', clampedLevel);
        console.log('[SoteriaCharacter] setEnergy:', clampedLevel);
      },
    }));

    // Update category when prop changes
    useEffect(() => {
      // riveRef.current?.setInputState('MainCharacter', 'category_focus', categoryValue);
    }, [category, categoryValue]);

    // Update active state when prop changes
    useEffect(() => {
      // riveRef.current?.setInputState('MainCharacter', 'is_active', isActive);
    }, [isActive]);

    // PLACEHOLDER: Replace with Rive component when ready
    // This shows a simple placeholder until the Rive animation is created
    return (
      <View style={[styles.container, style]}>
        {/*
        // Uncomment when rive-react-native is installed and .riv file is ready:
        <Rive
          ref={riveRef}
          resourceName="soteria_character_core"
          artboardName="MainCharacter"
          stateMachineName="MainCharacter"
          autoplay={true}
          style={{ width: size, height: size }}
        />
        */}

        {/* Placeholder visualization */}
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <View style={[styles.placeholderCircle, { backgroundColor: categoryColor }]}>
            <Text style={styles.placeholderText}>
              {isActive ? '🏃' : '🧘'}
            </Text>
          </View>
          <Text style={styles.placeholderLabel}>
            {isActive ? 'Active' : 'Idle'}
          </Text>
          <Text style={styles.placeholderHint}>
            Rive character goes here
          </Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surfaceLight,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColors.borderLight,
    borderStyle: 'dashed',
  },
  placeholderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  placeholderText: {
    fontSize: 32,
  },
  placeholderLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  placeholderHint: {
    marginTop: 4,
    fontSize: 10,
    color: AppColors.textMuted,
  },
});

SoteriaCharacter.displayName = 'SoteriaCharacter';

export default SoteriaCharacter;
