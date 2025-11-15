import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { UncelebratedMilestone } from '@/types';
import { getRarityColor, getRarityLabel } from '@/lib/utils/milestones';
import { LinearGradient } from 'expo-linear-gradient';

interface MilestoneCelebrationModalProps {
  visible: boolean;
  milestone: UncelebratedMilestone | null;
  onClose: () => void;
  onShare?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function MilestoneCelebrationModal({
  visible,
  milestone,
  onClose,
  onShare,
}: MilestoneCelebrationModalProps) {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const starAnimations = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (visible && milestone) {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      starAnimations.forEach((anim) => anim.setValue(0));

      // Start celebration animation sequence
      Animated.sequence([
        // Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Scale in the card with bounce
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate stars/particles in random patterns
      starAnimations.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 50),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }
  }, [visible, milestone]);

  if (!milestone) return null;

  const rarityColor = getRarityColor(milestone.rarity);
  const rarityLabel = getRarityLabel(milestone.rarity);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Animated particles/stars */}
        {starAnimations.map((anim, index) => {
          const randomX = Math.random() * width;
          const randomY = Math.random() * height * 0.6;
          const randomSize = 10 + Math.random() * 20;

          return (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  left: randomX,
                  top: randomY,
                  width: randomSize,
                  height: randomSize,
                  opacity: anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -100],
                      }),
                    },
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 1, 0.5],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="star" size={randomSize} color={rarityColor} />
            </Animated.View>
          );
        })}

        {/* Main celebration card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[AppColors.surface, AppColors.surfaceSecondary]}
            style={styles.card}
          >
            {/* Rarity badge */}
            <View
              style={[
                styles.rarityBadge,
                { backgroundColor: rarityColor + '20', borderColor: rarityColor },
              ]}
            >
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {rarityLabel}
              </Text>
            </View>

            {/* Milestone icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: milestone.icon_color + '20' },
              ]}
            >
              <Ionicons
                name={milestone.icon_name as any}
                size={64}
                color={milestone.icon_color}
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Milestone Achieved!</Text>

            {/* Milestone name */}
            <Text style={styles.milestoneName}>{milestone.name}</Text>

            {/* Description */}
            <Text style={styles.description}>{milestone.description}</Text>

            {/* Action buttons */}
            <View style={styles.actions}>
              {onShare && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.shareButton,
                    { backgroundColor: AppColors.primary },
                  ]}
                  onPress={onShare}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="share-social"
                    size={20}
                    color={AppColors.textPrimary}
                  />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.continueButton,
                  !onShare && styles.continueButtonFull,
                ]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
  cardContainer: {
    width: width * 0.85,
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  rarityBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  milestoneName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  continueButton: {
    backgroundColor: AppColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  continueButtonFull: {
    flex: 1,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
});
