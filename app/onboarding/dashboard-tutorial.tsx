import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FloatingSoteriaGuide from './components/FloatingSoteriaGuide';
import TutorialDashboard from './components/TutorialDashboard';
import OnboardingButton from './components/OnboardingButton';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaPresence from './components/SoteriaPresence';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { AppColors } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

type TutorialStep = 'intro' | 'avatars' | 'harmony' | 'stats' | 'transition';

// Dialogue content for each step
const STEP_DIALOGUE: Record<TutorialStep, string[]> = {
  intro: [
    'Let me show you something special.',
    'A place where you will care for yourself —',
    'mind, body, and soul.',
  ],
  avatars: [
    'These are your three lights.',
    'Mind, Body, and Soul.',
    'Complete routines, and they glow brighter.',
    'Neglect them, and they fade.',
  ],
  harmony: [
    'Balance all three each day.',
    'Do this for seven days straight...',
    '...and you will achieve Harmony.',
  ],
  stats: [
    'Track your progress here.',
    'Streaks. Routines completed.',
    'Every step forward counts.',
  ],
  transition: [
    'Now, let us give your lights a form.',
    'Little companions, reflections of you.',
    'Ready to meet them?',
  ],
};

// Soteria position for each step (relative to spotlight)
const STEP_POSITIONS: Record<TutorialStep, 'center' | 'top-right' | 'left' | 'top-left' | 'bottom-center'> = {
  intro: 'center',
  avatars: 'bottom-center',
  harmony: 'left',
  stats: 'bottom-center',
  transition: 'center',
};

// Pointing direction for each step
const STEP_POINTING: Record<TutorialStep, 'none' | 'down' | 'right' | 'up'> = {
  intro: 'none',
  avatars: 'up',
  harmony: 'right',
  stats: 'up',
  transition: 'none',
};

// Highlight section for each step
const STEP_HIGHLIGHTS: Record<TutorialStep, 'none' | 'avatars' | 'harmony' | 'stats'> = {
  intro: 'none',
  avatars: 'avatars',
  harmony: 'harmony',
  stats: 'stats',
  transition: 'none',
};

const STEP_ORDER: TutorialStep[] = ['intro', 'avatars', 'harmony', 'stats', 'transition'];

export default function DashboardTutorialScreen() {
  const router = useRouter();
  const { data } = useOnboarding();

  const [currentStep, setCurrentStep] = useState<TutorialStep>('intro');
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [showSkip, setShowSkip] = useState(true);

  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  const currentDialogue = STEP_DIALOGUE[currentStep];
  const isLastDialogue = currentDialogueIndex >= currentDialogue.length - 1;
  const isLastStep = currentStep === 'transition';
  const showDashboard = currentStep !== 'intro' && currentStep !== 'transition';

  // Typewriter effect
  const startTyping = useCallback((text: string, onComplete: () => void) => {
    setDisplayedText('');
    setIsTyping(true);
    charIndexRef.current = 0;

    const typeNextChar = () => {
      if (charIndexRef.current < text.length) {
        const nextChar = text[charIndexRef.current];
        setDisplayedText(text.substring(0, charIndexRef.current + 1));

        if (nextChar !== ' ' && nextChar !== '\n' && charIndexRef.current % HAPTIC_FREQUENCY === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        charIndexRef.current++;
        typingRef.current = setTimeout(typeNextChar, TYPING_SPEED);
      } else {
        setIsTyping(false);
        onComplete();
      }
    };

    typeNextChar();
  }, []);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, []);

  // Start typing current dialogue
  useEffect(() => {
    const text = currentDialogue[currentDialogueIndex];
    setShowButton(false);

    startTyping(text, () => {
      if (isLastDialogue) {
        // Show continue button after last dialogue in step
        setTimeout(() => {
          setShowButton(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 600);
      } else {
        // Auto-advance to next dialogue line
        const pauseDuration = 700;
        typingRef.current = setTimeout(() => {
          setCurrentDialogueIndex(prev => prev + 1);
        }, pauseDuration);
      }
    });

    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [currentStep, currentDialogueIndex, startTyping]);

  // Handle tap to speed up typing
  const handleTapToSpeed = () => {
    if (isTyping) {
      if (typingRef.current) clearTimeout(typingRef.current);
      setDisplayedText(currentDialogue[currentDialogueIndex]);
      setIsTyping(false);

      if (isLastDialogue) {
        setShowButton(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setTimeout(() => {
          setCurrentDialogueIndex(prev => prev + 1);
        }, 300);
      }
    }
  };

  // Handle continue button
  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowButton(false);

    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      // Move to next step
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
      setCurrentDialogueIndex(0);
    } else {
      // Navigate to avatar naming
      router.push('/onboarding/mind-extraction');
    }
  };

  // Handle skip
  const handleSkip = () => {
    if (typingRef.current) clearTimeout(typingRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSkip(false);
    router.push('/onboarding/mind-extraction');
  };

  const getButtonLabel = () => {
    if (isLastStep) return 'Show me';
    return 'Continue';
  };

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep="dashboard-tutorial" />

      {/* Skip button */}
      {showSkip && !isLastStep && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Full-screen Dashboard with overlay (for dashboard steps) */}
      {showDashboard && (
        <TutorialDashboard
          highlightSection={STEP_HIGHLIGHTS[currentStep]}
          userName={data.firstName || 'there'}
        />
      )}

      {/* Centered Soteria for intro/transition steps */}
      {!showDashboard && (
        <View style={styles.centeredContent}>
          <SoteriaPresence
            size={currentStep === 'transition' ? 'large' : 'medium'}
            intensity="high"
          />
        </View>
      )}

      {/* Floating Soteria guide (for dashboard steps) - positioned above overlay */}
      {showDashboard && (
        <FloatingSoteriaGuide
          position={STEP_POSITIONS[currentStep]}
          pointingDirection={STEP_POINTING[currentStep]}
          visible={true}
        />
      )}

      {/* Dialogue area - always at bottom */}
      <View style={styles.dialogueArea}>
        <TouchableOpacity
          style={styles.dialogueContainer}
          onPress={handleTapToSpeed}
          activeOpacity={1}
        >
          <Text style={styles.dialogueText}>
            {displayedText}
            {isTyping && <Text style={styles.cursor}>|</Text>}
          </Text>
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {STEP_ORDER.map((step, index) => (
            <View
              key={step}
              style={[
                styles.stepDot,
                STEP_ORDER.indexOf(currentStep) >= index && styles.stepDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Continue button */}
      <OnboardingButton
        label={getButtonLabel()}
        onPress={handleContinue}
        visible={showButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogueArea: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    zIndex: 100,
  },
  dialogueContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dialogueText: {
    fontSize: 18,
    lineHeight: 28,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  cursor: {
    color: AppColors.primary,
    fontWeight: '300',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    backgroundColor: AppColors.primary,
  },
});
