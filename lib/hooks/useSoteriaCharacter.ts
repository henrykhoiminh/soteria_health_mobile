/**
 * useSoteriaCharacter - Hook for controlling the Soteria character animation
 *
 * This hook provides a convenient interface for triggering character animations
 * from anywhere in the app.
 *
 * Usage:
 * ```tsx
 * const character = useSoteriaCharacter();
 *
 * // In your component
 * <SoteriaCharacter ref={character.characterRef} size={150} />
 *
 * // Trigger animations
 * character.triggerCelebration();
 * character.goDormant();
 * character.wakeUp();
 * ```
 *
 * See: assets/animations/SOTERIA_CHARACTER_PLAN.md for full guide
 */

import { useRef, useCallback } from 'react';
import { SoteriaCharacterHandle } from '@/components/SoteriaCharacter';
import { RoutineCategory } from '@/types';

export function useSoteriaCharacter() {
  const characterRef = useRef<SoteriaCharacterHandle>(null);

  /**
   * Trigger routine completion celebration
   * Use when: User finishes a routine
   */
  const triggerCelebration = useCallback(() => {
    characterRef.current?.triggerCelebration();
  }, []);

  /**
   * Trigger major celebration (harmony achieved, big milestone)
   * Use when: User achieves Harmony status, big streak milestone
   */
  const triggerMajorCelebration = useCallback(() => {
    characterRef.current?.triggerMajorCelebration();
  }, []);

  /**
   * Transition to dormant/sleepy state
   * Use when: User has been inactive (avatar decay)
   */
  const goDormant = useCallback(() => {
    characterRef.current?.goDormant();
  }, []);

  /**
   * Wake up from dormant state
   * Use when: User returns after inactivity
   */
  const wakeUp = useCallback(() => {
    characterRef.current?.wakeUp();
  }, []);

  /**
   * Start routine - transition to active/ready state
   * Use when: User begins a routine
   */
  const startRoutine = useCallback(() => {
    characterRef.current?.startRoutine();
  }, []);

  /**
   * End routine - transition back to idle
   * Use when: Routine is paused or cancelled
   */
  const endRoutine = useCallback(() => {
    characterRef.current?.endRoutine();
  }, []);

  /**
   * Set the current category (affects character accent color)
   * Use when: Category changes (Mind, Body, Soul)
   */
  const setCategory = useCallback((category: RoutineCategory) => {
    characterRef.current?.setCategory(category);
  }, []);

  /**
   * Set energy level (0-100, affects animation intensity)
   * Use when: Progress through routine, streak multiplier, etc.
   */
  const setEnergy = useCallback((level: number) => {
    characterRef.current?.setEnergy(level);
  }, []);

  return {
    characterRef,
    triggerCelebration,
    triggerMajorCelebration,
    goDormant,
    wakeUp,
    startRoutine,
    endRoutine,
    setCategory,
    setEnergy,
  };
}

export default useSoteriaCharacter;
