import React, { createContext, useContext, useState, useCallback } from 'react';
import { JourneyFocus } from '@/types';

// Onboarding data collected during the flow
export interface OnboardingData {
  // Journey
  journeyFocus: JourneyFocus | null;

  // Avatar names
  mindName: string;
  bodyName: string;
  soulName: string;

  // User identity
  firstName: string;
  lastName: string;
  username: string;
  profilePictureUri: string | null;

  // Initial wellness check-in (during extraction)
  mindScore: number;
  bodyScore: number;
  soulScore: number;
}

// Default/initial state
const defaultOnboardingData: OnboardingData = {
  journeyFocus: null,
  mindName: '',
  bodyName: '',
  soulName: '',
  firstName: '',
  lastName: '',
  username: '',
  profilePictureUri: null,
  mindScore: 0,
  bodyScore: 0,
  soulScore: 0,
};

interface OnboardingContextType {
  // Current data
  data: OnboardingData;

  // Whether this is a reset flow (existing user) vs new user
  isResetFlow: boolean;
  setIsResetFlow: (value: boolean) => void;

  // Update functions
  setJourneyFocus: (focus: JourneyFocus) => void;
  setMindName: (name: string) => void;
  setBodyName: (name: string) => void;
  setSoulName: (name: string) => void;
  setFirstName: (name: string) => void;
  setLastName: (name: string) => void;
  setUsername: (username: string) => void;
  setProfilePictureUri: (uri: string | null) => void;
  setMindScore: (score: number) => void;
  setBodyScore: (score: number) => void;
  setSoulScore: (score: number) => void;

  // Bulk update
  updateData: (updates: Partial<OnboardingData>) => void;

  // Reset to initial state
  resetOnboarding: () => void;

  // Validation helpers
  isJourneySelected: boolean;
  isAvatarNamingComplete: boolean;
  isIdentityComplete: boolean;
  isUsernameSet: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData);
  const [isResetFlow, setIsResetFlow] = useState(false);

  // Individual setters
  const setJourneyFocus = useCallback((focus: JourneyFocus) => {
    setData(prev => ({ ...prev, journeyFocus: focus }));
  }, []);

  const setMindName = useCallback((name: string) => {
    setData(prev => ({ ...prev, mindName: name }));
  }, []);

  const setBodyName = useCallback((name: string) => {
    setData(prev => ({ ...prev, bodyName: name }));
  }, []);

  const setSoulName = useCallback((name: string) => {
    setData(prev => ({ ...prev, soulName: name }));
  }, []);

  const setFirstName = useCallback((name: string) => {
    setData(prev => ({ ...prev, firstName: name }));
  }, []);

  const setLastName = useCallback((name: string) => {
    setData(prev => ({ ...prev, lastName: name }));
  }, []);

  const setUsername = useCallback((username: string) => {
    setData(prev => ({ ...prev, username: username }));
  }, []);

  const setProfilePictureUri = useCallback((uri: string | null) => {
    setData(prev => ({ ...prev, profilePictureUri: uri }));
  }, []);

  const setMindScore = useCallback((score: number) => {
    setData(prev => ({ ...prev, mindScore: score }));
  }, []);

  const setBodyScore = useCallback((score: number) => {
    setData(prev => ({ ...prev, bodyScore: score }));
  }, []);

  const setSoulScore = useCallback((score: number) => {
    setData(prev => ({ ...prev, soulScore: score }));
  }, []);

  // Bulk update
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset
  const resetOnboarding = useCallback(() => {
    setData(defaultOnboardingData);
    setIsResetFlow(false);
  }, []);

  // Validation helpers
  const isJourneySelected = data.journeyFocus !== null;
  const isAvatarNamingComplete =
    data.mindName.trim().length > 0 &&
    data.bodyName.trim().length > 0 &&
    data.soulName.trim().length > 0;
  const isIdentityComplete =
    data.firstName.trim().length > 0 &&
    data.lastName.trim().length > 0;
  const isUsernameSet = data.username.trim().length > 0;

  return (
    <OnboardingContext.Provider
      value={{
        data,
        isResetFlow,
        setIsResetFlow,
        setJourneyFocus,
        setMindName,
        setBodyName,
        setSoulName,
        setFirstName,
        setLastName,
        setUsername,
        setProfilePictureUri,
        setMindScore,
        setBodyScore,
        setSoulScore,
        updateData,
        resetOnboarding,
        isJourneySelected,
        isAvatarNamingComplete,
        isIdentityComplete,
        isUsernameSet,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

// Avatar name options (preset choices)
export const MIND_NAME_OPTIONS = ['Theo', 'Mina', 'Mochi'] as const;
export const BODY_NAME_OPTIONS = ['Atlas', 'Paz', 'Miguel'] as const;
export const SOUL_NAME_OPTIONS = ['Bodhi', 'Lotus', 'Tofu'] as const;

// Types for avatar names
export type MindName = typeof MIND_NAME_OPTIONS[number];
export type BodyName = typeof BODY_NAME_OPTIONS[number];
export type SoulName = typeof SOUL_NAME_OPTIONS[number];

// Max character limits
export const USERNAME_MAX_LENGTH = 20;
