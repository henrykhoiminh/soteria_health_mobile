import JourneyBadge from '@/components/JourneyBadge';
import { AppColors } from '@/constants/theme';
import { useOnboarding } from '@/lib/contexts/OnboardingContext';
import { JourneyFocus, UPPER_BODY_AREAS, LOWER_BODY_AREAS } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import OnboardingButton from './components/OnboardingButton';
import OnboardingProgress from './components/OnboardingProgress';
import SoteriaDialogueBox from './components/SoteriaDialogueBox';
import SoteriaPresence from './components/SoteriaPresence';
import CharacterSummoningAnimation from './components/CharacterSummoningAnimation';

// Recovery category definitions
const RECOVERY_CATEGORIES = [
  {
    id: 'Mind',
    label: 'Mind',
    icon: 'bulb-outline' as const,
    color: AppColors.mind,
    description: 'Mental wellness & stress recovery',
  },
  {
    id: 'Body',
    label: 'Body',
    icon: 'body-outline' as const,
    color: AppColors.body,
    description: 'Physical recovery from injury',
  },
  {
    id: 'Soul',
    label: 'Soul',
    icon: 'sparkles-outline' as const,
    color: AppColors.soul,
    description: 'Emotional & spiritual healing',
  },
];

// Phase 1: Initial mystery - Soteria notices the user (two-part dialogue)
const mysteryCaptions = [
  { text: 'Well, well...', pauseAfter: 800 },
  { text: 'Who do we have here?', pauseAfter: 0 },
];

// Phase 3: After user enters name - Soteria introduces herself
const introCaptions = [
  { text: 'I am Soteria.', pauseAfter: 700 },
  { text: 'I have guided many before you.', pauseAfter: 800 },
  { text: 'So tell me...', pauseAfter: 600 },
  { text: 'What is it you seek?', pauseAfter: 0 },
];

// Welcome captions after journey selection
const preventionWelcomeCaptions = [
  { text: 'Preparation over repair.', pauseAfter: 1200 },
  { text: 'Wise.', pauseAfter: 1000 },
  { text: 'Welcome.', pauseAfter: 0 },
];

// Recovery welcome captions are generated dynamically to include recovery areas
const getRecoveryWelcomeCaptions = (areasFormatted: string) => [
  { text: `Your ${areasFormatted}...`, pauseAfter: 1200 },
  { text: 'I understand.', pauseAfter: 1400 },
  { text: 'Seeking healing is extremely wise.', pauseAfter: 1200 },
  { text: "Let's see what we can do.", pauseAfter: 1000 },
  { text: 'Come with me.', pauseAfter: 0 },
];

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

type Phase = 'mystery' | 'name-entry' | 'reinforcement' | 'intro' | 'choices' | 'welcome' | 'complete';

// Screen 2: Finding Soteria
export default function FindingSoteriaScreen() {
  const router = useRouter();
  const { data, setFirstName, setLastName, setJourneyFocus, setRecoveryAreas } = useOnboarding();

  // Phase management
  const [phase, setPhase] = useState<Phase>('mystery');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mysteryIndex, setMysteryIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<JourneyFocus | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [showNameInputs, setShowNameInputs] = useState(false);
  const [reinforcementComplete, setReinforcementComplete] = useState(false);
  const [showSummoning, setShowSummoning] = useState(true);
  const [summoningComplete, setSummoningComplete] = useState(false);

  // Recovery areas modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showBodyPartsPicker, setShowBodyPartsPicker] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  // Animation refs
  const choicesOpacity = useRef(new Animated.Value(0)).current;
  const choicesScale = useRef(new Animated.Value(0.9)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.8)).current;
  const inputsOpacity = useRef(new Animated.Value(0)).current;
  const inputsTranslateY = useRef(new Animated.Value(20)).current;

  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  const isNameValid = data.firstName.trim().length > 0 && data.lastName.trim().length > 0;

  // Recovery area helpers
  const isCategorySelected = (categoryId: string): boolean => {
    if (categoryId === 'Mind' || categoryId === 'Soul') {
      return selectedAreas.includes(categoryId);
    }
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
    return selectedAreas.some(area => bodyParts.includes(area as typeof bodyParts[number]));
  };

  const getSelectedBodyParts = (): string[] => {
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
    return selectedAreas.filter(area => bodyParts.includes(area as typeof bodyParts[number]));
  };

  const toggleCategory = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (categoryId === 'Mind' || categoryId === 'Soul') {
      setSelectedAreas(prev =>
        prev.includes(categoryId)
          ? prev.filter(a => a !== categoryId)
          : [...prev, categoryId]
      );
    } else if (categoryId === 'Body') {
      setShowBodyPartsPicker(true);
    }
  };

  const toggleBodyPart = (part: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAreas(prev =>
      prev.includes(part)
        ? prev.filter(a => a !== part)
        : [...prev, part]
    );
  };

  const clearBodyParts = () => {
    const bodyParts = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS];
    setSelectedAreas(prev => prev.filter(a => !bodyParts.includes(a as typeof bodyParts[number])));
  };

  // Format recovery areas for dialogue (natural language)
  const formatRecoveryAreasForDialogue = (): string => {
    const areas: string[] = [];
    const selectedBodyParts = getSelectedBodyParts();
    if (selectedAreas.includes('Mind')) areas.push('Mind');
    if (selectedBodyParts.length > 0) areas.push('Body');
    if (selectedAreas.includes('Soul')) areas.push('Soul');

    if (areas.length === 1) return areas[0];
    if (areas.length === 2) return `${areas[0]} and ${areas[1]}`;
    return `${areas[0]}, ${areas[1]}, and ${areas[2]}`;
  };

  const canContinueRecovery = selectedAreas.length > 0;

  // Get current captions based on phase
  const getCurrentCaptions = useCallback(() => {
    if (phase === 'mystery') return mysteryCaptions;
    if (phase === 'intro') return introCaptions;
    if (phase === 'welcome' && selectedFocus) {
      return selectedFocus === 'Injury Prevention'
        ? preventionWelcomeCaptions
        : getRecoveryWelcomeCaptions(formatRecoveryAreasForDialogue());
    }
    return [];
  }, [phase, selectedFocus, selectedAreas]);

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

  // Skip current typing to end
  const skipToEnd = useCallback(() => {
    if (typingRef.current) {
      clearTimeout(typingRef.current);
    }
    const captions = getCurrentCaptions();
    const index = phase === 'mystery' ? mysteryIndex : currentIndex;
    if (captions[index]) {
      setDisplayedText(captions[index].text);
      setIsTyping(false);
    }
  }, [getCurrentCaptions, currentIndex, mysteryIndex, phase]);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, []);

  // Handle summoning animation complete
  const handleSummoningComplete = () => {
    setSummoningComplete(true);
    setShowSummoning(false);
  };

  // Mystery phase - cycle through mystery captions then show name modal
  useEffect(() => {
    if (phase !== 'mystery' || !summoningComplete) return;

    const currentCaption = mysteryCaptions[mysteryIndex];

    const startTimer = setTimeout(() => {
      startTyping(currentCaption.text, () => {
        if (mysteryIndex < mysteryCaptions.length - 1) {
          // Move to next mystery caption after pause
          const nextTimer = setTimeout(() => {
            setMysteryIndex(prev => prev + 1);
          }, currentCaption.pauseAfter);
          typingRef.current = nextTimer;
        } else {
          // All mystery captions complete - show inputs
          setTimeout(() => {
            setShowNameInputs(true);
            setPhase('name-entry');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Fade in inputs
            Animated.parallel([
              Animated.timing(inputsOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(inputsTranslateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();
          }, 800);
        }
      });
    }, mysteryIndex === 0 ? 1500 : 0); // Only delay on first caption

    return () => {
      clearTimeout(startTimer);
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, mysteryIndex, startTyping, summoningComplete]);

  // Reinforcement phase - show personalized message
  useEffect(() => {
    if (phase !== 'reinforcement') return;

    // Ensure button is hidden and reinforcement not complete
    setShowButton(false);
    setReinforcementComplete(false);

    const reinforcementMessage = `${data.firstName}...\n I sense great courage in you.`;

    // Small delay before starting to type
    const startDelay = setTimeout(() => {
      startTyping(reinforcementMessage, () => {
        // After typing completes, pause then show "Who are you?" button
        setTimeout(() => {
          setReinforcementComplete(true);
          setShowButton(true);
        }, 1000);
      });
    }, 500);

    return () => clearTimeout(startDelay);
  }, [phase, data.firstName, startTyping]);

  // Intro phase - cycle through intro captions
  useEffect(() => {
    if (phase !== 'intro') return;

    const captions = introCaptions;
    const currentCaption = captions[currentIndex];

    // Show skip button after first caption starts
    if (currentIndex === 0) {
      setTimeout(() => setShowSkip(true), 1500);
    }

    startTyping(currentCaption.text, () => {
      if (currentIndex < captions.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);
        typingRef.current = nextTimer;
      } else {
        // Show journey choices
        setTimeout(() => {
          setShowSkip(false);
          setPhase('choices');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.parallel([
            Animated.timing(choicesOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(choicesScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          ]).start();
        }, 1200);
      }
    });

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, startTyping]);

  // Welcome phase - show welcome message after selection
  useEffect(() => {
    if (phase !== 'welcome' || !selectedFocus) return;

    // Wait until currentIndex is properly initialized (not -1)
    if (currentIndex < 0) return;

    const captions = selectedFocus === 'Injury Prevention'
      ? preventionWelcomeCaptions
      : getRecoveryWelcomeCaptions(formatRecoveryAreasForDialogue());
    const currentCaption = captions[currentIndex];

    // Guard: wait until currentIndex is valid
    if (!currentCaption) return;

    startTyping(currentCaption.text, () => {
      if (currentIndex < captions.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);
        typingRef.current = nextTimer;
      } else {
        // Show continue button
        setTimeout(() => {
          setPhase('complete');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowButton(true);
        }, 800);
      }
    });

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, currentIndex, selectedFocus, startTyping]);

  // Handle name submission
  const handleNameSubmit = () => {
    if (!isNameValid) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowButton(false);

    // Dismiss keyboard first
    Keyboard.dismiss();

    // Wait for keyboard to dismiss, then fade out inputs
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(inputsOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(inputsTranslateY, {
          toValue: 20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowNameInputs(false);
        // Clear the "Who do we have here?" text before transitioning
        setDisplayedText('');
        // Beat before transitioning to reinforcement
        setTimeout(() => {
          setPhase('reinforcement');
        }, 300);
      });
    }, 200);
  };

  // Handle "Who are you?" button - proceed to intro
  const handleAskWhoAreYou = () => {
    setShowButton(false);
    setTimeout(() => {
      setCurrentIndex(0);
      setPhase('intro');
    }, 200);
  };

  // Handle journey selection
  const handleSelect = (focus: JourneyFocus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJourneyFocus(focus);
    setSelectedFocus(focus);

    if (focus === 'Recovery') {
      // Show recovery areas modal first
      setShowRecoveryModal(true);
    } else {
      // Injury Prevention - proceed directly to welcome
      proceedToWelcome();
    }
  };

  // Proceed to welcome phase after journey selection (and recovery areas if applicable)
  const proceedToWelcome = () => {
    // Reset currentIndex BEFORE changing phase to avoid stale index issues
    setCurrentIndex(-1); // Use -1 as a "not started" marker

    // Immediately change phase to remove choices from DOM and update layout
    setPhase('welcome');

    // Brief delay, then show badge and start welcome dialogue
    setTimeout(() => {
      // Show badge
      Animated.parallel([
        Animated.timing(badgeOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(badgeScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start(() => {
        // Start welcome dialogue after badge appears
        setCurrentIndex(0);
      });
    }, 150);
  };

  // Handle recovery areas confirmation
  const handleRecoveryConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecoveryAreas(selectedAreas);
    setShowRecoveryModal(false);
    proceedToWelcome();
  };

  // Handle recovery modal cancel - go back to choices
  const handleRecoveryCancel = () => {
    setShowRecoveryModal(false);
    setSelectedAreas([]);
    setSelectedFocus(null);
    setJourneyFocus(null as unknown as JourneyFocus);
  };

  // Handle skip - jump to choices
  const handleSkip = () => {
    if (typingRef.current) clearTimeout(typingRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setShowSkip(false);
    setDisplayedText('What is it you seek?');
    setPhase('choices');

    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.timing(choicesOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(choicesScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();
    }, 50);
  };

  // Handle tap to speed up typing
  const handleTapToSpeed = () => {
    if (isTyping) {
      skipToEnd();
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/three-lights');
  };

  // Get button label and action based on phase
  const getButtonConfig = () => {
    // name-entry phase uses modal button, not OnboardingButton
    if (phase === 'reinforcement') {
      // Only show "Who are you?" after reinforcement dialogue is complete
      return { label: 'Who are you?', onPress: handleAskWhoAreYou, visible: reinforcementComplete && showButton };
    }
    if (phase === 'complete') {
      return { label: 'Enter Soteria', onPress: handleContinue, visible: showButton };
    }
    return { label: '', onPress: () => {}, visible: false };
  };

  const buttonConfig = getButtonConfig();

  return (
    <SafeAreaView style={styles.container}>
      {/* Summoning animation for Soteria */}
      {showSummoning && (
        <CharacterSummoningAnimation
          characterColor="#FFD700"
          onAnimationComplete={handleSummoningComplete}
          dramatic={true}
        >
          <SoteriaPresence size="large" intensity="high" />
        </CharacterSummoningAnimation>
      )}

      <OnboardingProgress currentStep="finding-soteria" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Soteria's presence - only show after summoning completes */}
          {summoningComplete && (
            <View style={styles.presenceContainer}>
              <SoteriaPresence
                size={phase === 'choices' || selectedFocus ? 'medium' : 'large'}
                intensity={phase === 'reinforcement' ? 'high' : 'medium'}
              />
            </View>
          )}

          {/* Journey Badge - appears after selection */}
          {selectedFocus && (
            <Animated.View
              style={[
                styles.badgeContainer,
                { opacity: badgeOpacity, transform: [{ scale: badgeScale }] },
              ]}
            >
              <JourneyBadge focus={selectedFocus} size="md" />
            </Animated.View>
          )}

          {/* Caption text - tap to speed up, only show after summoning */}
          {summoningComplete && (
            <TouchableOpacity
              style={styles.dialogueBoxContainer}
              onPress={handleTapToSpeed}
              activeOpacity={1}
            >
              <SoteriaDialogueBox
                text={displayedText}
                glowPosition="top"
                isTyping={isTyping}
              />
            </TouchableOpacity>
          )}

          {/* Name inputs - inline, appears when Soteria shrinks */}
          {showNameInputs && (
            <Animated.View
              style={[
                styles.inputsContainer,
                {
                  opacity: inputsOpacity,
                  transform: [{ translateY: inputsTranslateY }],
                },
              ]}
            >
              <TextInput
                style={styles.input}
                value={data.firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                autoCapitalize="words"
                autoFocus={true}
              />
              <TextInput
                style={styles.input}
                value={data.lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !isNameValid && styles.submitButtonDisabled,
                ]}
                onPress={handleNameSubmit}
                disabled={!isNameValid}
              >
                <Text
                  style={[
                    styles.submitButtonText,
                    !isNameValid && styles.submitButtonTextDisabled,
                  ]}
                >
                  Introduce Yourself
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Journey choice cards */}
          {phase === 'choices' && (
            <Animated.View
              style={[
                styles.choicesContainer,
                { opacity: choicesOpacity, transform: [{ scale: choicesScale }] },
              ]}
            >
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => handleSelect('Injury Prevention')}
              >
                <View style={[styles.choiceIconContainer, styles.preventionIcon]}>
                  <Ionicons name="shield-checkmark" size={32} color="#3B82F6" />
                </View>
                <View style={styles.choiceTextContainer}>
                  <Text style={styles.choiceTitle}>Injury Prevention</Text>
                  <Text style={styles.choiceDescription}>
                    Build strength before you need it
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => handleSelect('Recovery')}
              >
                <View style={[styles.choiceIconContainer, styles.recoveryIcon]}>
                  <Ionicons name="heart" size={32} color="#EF4444" />
                </View>
                <View style={styles.choiceTextContainer}>
                  <Text style={styles.choiceTitle}>Recovery</Text>
                  <Text style={styles.choiceDescription}>
                    Rebuild and heal the right way
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Skip button - only during intro phase */}
      <OnboardingButton
        label="Skip"
        onPress={handleSkip}
        visible={showSkip}
        variant="secondary"
      />

      {/* Primary action button - always at bottom */}
      <OnboardingButton
        label={buttonConfig.label}
        onPress={buttonConfig.onPress}
        visible={buttonConfig.visible}
      />

      {/* Recovery Areas Modal */}
      <Modal
        visible={showRecoveryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleRecoveryCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recovery Areas</Text>
              <Text style={styles.modalSubtitle}>
                Where does your healing journey need to focus?
              </Text>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Recovery Categories */}
              {RECOVERY_CATEGORIES.map((category) => {
                const isSelected = isCategorySelected(category.id);
                const isBody = category.id === 'Body';
                const selectedBodyParts = getSelectedBodyParts();

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      isSelected && { borderColor: category.color },
                    ]}
                    onPress={() => toggleCategory(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryContent}>
                      <View
                        style={[
                          styles.categoryIconContainer,
                          { backgroundColor: category.color + '20' },
                        ]}
                      >
                        <Ionicons
                          name={category.icon}
                          size={28}
                          color={category.color}
                        />
                      </View>
                      <View style={styles.categoryTextContainer}>
                        <Text style={styles.categoryLabel}>{category.label}</Text>
                        <Text style={styles.categoryDescription}>
                          {category.description}
                        </Text>
                        {isBody && isSelected && selectedBodyParts.length > 0 && (
                          <Text style={styles.selectedBodyParts}>
                            {selectedBodyParts.join(', ')}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && { backgroundColor: category.color, borderColor: category.color },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        )}
                      </View>
                    </View>
                    {isBody && isSelected && (
                      <TouchableOpacity
                        style={styles.editBodyPartsButton}
                        onPress={() => setShowBodyPartsPicker(true)}
                      >
                        <Ionicons name="pencil" size={14} color={AppColors.primary} />
                        <Text style={styles.editBodyPartsText}>
                          {selectedBodyParts.length === 0 ? 'Select Body Parts' : 'Edit Body Parts'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Helper text */}
              {selectedAreas.length === 0 && (
                <Text style={styles.helperText}>
                  Select at least one area to continue
                </Text>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleRecoveryCancel}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  !canContinueRecovery && styles.continueButtonDisabled,
                ]}
                onPress={handleRecoveryConfirm}
                disabled={!canContinueRecovery}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Body Parts Picker Modal - nested inside recovery modal */}
        <Modal
          visible={showBodyPartsPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowBodyPartsPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.bodyPartsModal}>
              <View style={styles.bodyPartsHeader}>
                <Text style={styles.bodyPartsTitle}>Select Body Parts</Text>
                <TouchableOpacity
                  onPress={() => setShowBodyPartsPicker(false)}
                  style={styles.doneButton}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Upper Body */}
                <Text style={styles.bodyRegionTitle}>Upper Body</Text>
                <View style={styles.bodyPartsGrid}>
                  {UPPER_BODY_AREAS.map((part) => {
                    const isSelected = selectedAreas.includes(part);
                    return (
                      <TouchableOpacity
                        key={part}
                        style={[
                          styles.bodyPartChip,
                          isSelected && styles.bodyPartChipSelected,
                        ]}
                        onPress={() => toggleBodyPart(part)}
                      >
                        <Text
                          style={[
                            styles.bodyPartChipText,
                            isSelected && styles.bodyPartChipTextSelected,
                          ]}
                        >
                          {part}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Lower Body */}
                <Text style={styles.bodyRegionTitle}>Lower Body</Text>
                <View style={styles.bodyPartsGrid}>
                  {LOWER_BODY_AREAS.map((part) => {
                    const isSelected = selectedAreas.includes(part);
                    return (
                      <TouchableOpacity
                        key={part}
                        style={[
                          styles.bodyPartChip,
                          isSelected && styles.bodyPartChipSelected,
                        ]}
                        onPress={() => toggleBodyPart(part)}
                      >
                        <Text
                          style={[
                            styles.bodyPartChipText,
                            isSelected && styles.bodyPartChipTextSelected,
                          ]}
                        >
                          {part}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Clear All Button */}
                {getSelectedBodyParts().length > 0 && (
                  <TouchableOpacity
                    style={styles.clearAllButton}
                    onPress={clearBodyParts}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={AppColors.textSecondary} />
                    <Text style={styles.clearAllText}>Clear All Body Parts</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
  },
  presenceContainer: {
    marginBottom: 64,
  },
  badgeContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  dialogueBoxContainer: {
    width: '100%',
  },
  inputsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButtonText: {
    color: AppColors.primaryText,
    fontSize: 17,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  choicesContainer: {
    width: '100%',
    gap: 16,
    marginTop: 24,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  choiceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  preventionIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  recoveryIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  choiceDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: 400,
  },
  categoryCard: {
    padding: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColors.border,
    marginBottom: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  selectedBodyParts: {
    fontSize: 12,
    color: AppColors.body,
    marginTop: 6,
    fontStyle: 'italic',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBodyPartsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  editBodyPartsText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  helperText: {
    textAlign: 'center',
    color: AppColors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primaryText,
  },
  // Body Parts Picker Styles
  bodyPartsModal: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  bodyPartsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  bodyPartsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primaryText,
  },
  bodyRegionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  bodyPartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  bodyPartChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  bodyPartChipSelected: {
    backgroundColor: AppColors.body + '20',
    borderColor: AppColors.body,
  },
  bodyPartChipText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  bodyPartChipTextSelected: {
    color: AppColors.body,
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 12,
  },
  clearAllText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
});
