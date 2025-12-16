import { AppColors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Typing speed in milliseconds per character
const TYPING_SPEED = 40;
// Haptic frequency - trigger haptic every N characters
const HAPTIC_FREQUENCY = 2;

export interface Caption {
  text: string;
  pauseAfter: number;
  accumulate?: boolean; // If true, this caption stays on screen with previous accumulating captions
}

interface SkippableNarrativeProps {
  captions: Caption[];
  onComplete: () => void;
  showSkip?: boolean; // Whether to show skip button (default: true)
  skipLabel?: string; // Custom skip button label
  autoStart?: boolean; // Whether to start typing immediately (default: true)
  initialDelay?: number; // Delay before first caption (default: 0)
}

export default function SkippableNarrative({
  captions,
  onComplete,
  showSkip = true,
  skipLabel = 'Skip',
  autoStart = true,
  initialDelay = 0,
}: SkippableNarrativeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(!initialDelay && autoStart);

  const skipOpacity = useRef(new Animated.Value(0)).current;
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);

  // Show skip button after a short delay
  useEffect(() => {
    if (showSkip && hasStarted) {
      const timer = setTimeout(() => {
        Animated.timing(skipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 1500); // Show skip after 1.5s

      return () => clearTimeout(timer);
    }
  }, [showSkip, hasStarted]);

  // Initial delay before starting
  useEffect(() => {
    if (initialDelay && autoStart) {
      const timer = setTimeout(() => {
        setHasStarted(true);
      }, initialDelay);
      return () => clearTimeout(timer);
    }
  }, [initialDelay, autoStart]);

  // Typewriter effect
  const startTyping = useCallback((text: string, onTypingComplete: () => void) => {
    setDisplayedText('');
    setIsTyping(true);
    charIndexRef.current = 0;

    const typeNextChar = () => {
      if (charIndexRef.current < text.length) {
        const nextChar = text[charIndexRef.current];
        setDisplayedText(text.substring(0, charIndexRef.current + 1));

        // Haptic feedback for visible characters at specified frequency
        if (nextChar !== ' ' && nextChar !== '\n' && charIndexRef.current % HAPTIC_FREQUENCY === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        charIndexRef.current++;
        typingRef.current = setTimeout(typeNextChar, TYPING_SPEED);
      } else {
        setIsTyping(false);
        onTypingComplete();
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

  // Main typing effect
  useEffect(() => {
    if (!hasStarted || isComplete) return;

    const currentCaption = captions[currentIndex];

    startTyping(currentCaption.text, () => {
      // After typing completes
      if (currentIndex < captions.length - 1) {
        // Wait then move to next caption
        const nextTimer = setTimeout(() => {
          // Handle accumulating captions
          if (currentCaption.accumulate) {
            setAccumulatedText(prev => {
              if (prev) {
                return prev + '\n' + currentCaption.text;
              }
              return currentCaption.text;
            });
          } else if (!captions[currentIndex + 1]?.accumulate) {
            setAccumulatedText('');
          }

          setCurrentIndex(prev => prev + 1);
        }, currentCaption.pauseAfter);

        typingRef.current = nextTimer;
      } else {
        // All captions complete
        const completeTimer = setTimeout(() => {
          setIsComplete(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onComplete();
        }, 800);

        typingRef.current = completeTimer;
      }
    });

    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [currentIndex, hasStarted, isComplete, captions, startTyping, onComplete]);

  // Handle skip - immediately complete all captions
  const handleSkip = () => {
    if (typingRef.current) {
      clearTimeout(typingRef.current);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsComplete(true);
    onComplete();
  };

  // Handle tap to speed up - skip to end of current caption or next caption
  const handleTap = () => {
    if (isComplete) return;

    if (isTyping) {
      // Skip to end of current caption
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
      const currentCaption = captions[currentIndex];
      setDisplayedText(currentCaption.text);
      setIsTyping(false);

      // Move to next caption or complete
      if (currentIndex < captions.length - 1) {
        // Handle accumulation
        if (currentCaption.accumulate) {
          setAccumulatedText(prev => prev ? prev + '\n' + currentCaption.text : currentCaption.text);
        } else if (!captions[currentIndex + 1]?.accumulate) {
          setAccumulatedText('');
        }
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsComplete(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
      }
    }
  };

  // Determine what to show
  const currentCaption = captions[currentIndex];
  const showAccumulated = currentCaption?.accumulate ||
    (accumulatedText && currentIndex > 0 && captions[currentIndex - 1]?.accumulate);

  return (
    <View style={styles.container}>
      {/* Tap area to speed up */}
      <TouchableOpacity
        style={styles.tapArea}
        onPress={handleTap}
        activeOpacity={1}
      >
        <View style={styles.captionContainer}>
          {showAccumulated && accumulatedText ? (
            <Text style={styles.captionText}>
              {accumulatedText}
              {currentCaption?.accumulate && '\n'}
              {currentCaption?.accumulate && displayedText}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          ) : (
            <Text style={styles.captionText}>
              {displayedText}
              {isTyping && <Text style={styles.cursor}>|</Text>}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Skip button */}
      {showSkip && !isComplete && (
        <Animated.View style={[styles.skipContainer, { opacity: skipOpacity }]}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>{skipLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tapArea: {
    width: '100%',
  },
  captionContainer: {
    width: '100%',
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionText: {
    fontSize: 20,
    lineHeight: 30,
    color: AppColors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cursor: {
    color: AppColors.primary,
    fontWeight: '300',
  },
  skipContainer: {
    position: 'absolute',
    top: -40,
    right: 0,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
});
