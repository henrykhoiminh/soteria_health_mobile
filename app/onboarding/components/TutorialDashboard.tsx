import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, LayoutRectangle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/Avatar';
import { AppColors } from '@/constants/theme';
import { TUTORIAL_MOCK_DATA } from '@/lib/utils/tutorial-mock-data';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type HighlightSection = 'none' | 'avatars' | 'harmony' | 'stats';

interface TutorialDashboardProps {
  highlightSection: HighlightSection;
  userName?: string;
  onLayoutCapture?: (layouts: Record<string, LayoutRectangle>) => void;
}

export default function TutorialDashboard({
  highlightSection,
  userName = 'there',
  onLayoutCapture,
}: TutorialDashboardProps) {
  const { avatarStates, harmonyStatus, stats } = TUTORIAL_MOCK_DATA;

  // Store layout measurements for spotlight positioning
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});

  const captureLayout = (section: string) => (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setLayouts(prev => {
      const newLayouts = { ...prev, [section]: { x, y, width, height } };
      onLayoutCapture?.(newLayouts);
      return newLayouts;
    });
  };

  // Get the spotlight area based on current highlight
  const getSpotlightArea = (): LayoutRectangle | null => {
    if (highlightSection === 'none') return null;
    return layouts[highlightSection] || null;
  };

  const spotlightArea = getSpotlightArea();

  return (
    <View style={styles.container}>
      {/* Full Dashboard Content */}
      <View style={styles.dashboard}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Hello, {userName}</Text>
              <Text style={styles.subtitle}>Check out your personalized routines</Text>
            </View>
          </View>
        </View>

        {/* Avatars Section */}
        <View
          style={styles.section}
          onLayout={captureLayout('avatars')}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Awaken Your Light</Text>
            {/* Harmony Button */}
            <View
              style={styles.harmonyButton}
              onLayout={captureLayout('harmony')}
            >
              <Ionicons name="sparkles" size={16} color={AppColors.primary} />
              <Text style={styles.harmonyButtonText}>
                {harmonyStatus.consecutiveBalancedDays}/7
              </Text>
            </View>
          </View>

          <View style={styles.avatarsRow}>
            {avatarStates.map((avatar) => (
              <Avatar
                key={avatar.category}
                category={avatar.category}
                lightState={avatar.lightState}
                name={avatar.name}
              />
            ))}
          </View>
        </View>

        {/* Stats Section */}
        <View
          style={styles.section}
          onLayout={captureLayout('stats')}
        >
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.current_streak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statValueRow}>
                <Ionicons name="sparkles" size={18} color={AppColors.primary} />
                <Text style={styles.statValue}>{stats.harmony_streak}</Text>
              </View>
              <Text style={styles.statLabel}>Harmony Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_routines}</Text>
              <Text style={styles.statLabel}>Total Routines</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Dark Overlay with Spotlight */}
      {highlightSection !== 'none' && (
        <View style={styles.overlayContainer} pointerEvents="none">
          {spotlightArea ? (
            <>
              {/* Top dark area */}
              <View style={[
                styles.darkOverlay,
                {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: spotlightArea.y - 8,
                }
              ]} />

              {/* Left dark area */}
              <View style={[
                styles.darkOverlay,
                {
                  top: spotlightArea.y - 8,
                  left: 0,
                  width: spotlightArea.x - 8,
                  height: spotlightArea.height + 16,
                }
              ]} />

              {/* Right dark area */}
              <View style={[
                styles.darkOverlay,
                {
                  top: spotlightArea.y - 8,
                  right: 0,
                  left: spotlightArea.x + spotlightArea.width + 8,
                  height: spotlightArea.height + 16,
                }
              ]} />

              {/* Bottom dark area */}
              <View style={[
                styles.darkOverlay,
                {
                  top: spotlightArea.y + spotlightArea.height + 8,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }
              ]} />

              {/* Spotlight border/glow */}
              <View style={[
                styles.spotlightBorder,
                {
                  top: spotlightArea.y - 8,
                  left: spotlightArea.x - 8,
                  width: spotlightArea.width + 16,
                  height: spotlightArea.height + 16,
                }
              ]} />
            </>
          ) : (
            // Fallback full overlay while measuring
            <View style={[styles.darkOverlay, styles.fullOverlay]} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  dashboard: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: AppColors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.primaryText,
  },
  headerText: {
    gap: 2,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: AppColors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  harmonyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 221, 111, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  harmonyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  avatarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  // Overlay styles
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  darkOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  fullOverlay: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spotlightBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: AppColors.primary,
    borderRadius: 16,
    // Glow effect
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});
