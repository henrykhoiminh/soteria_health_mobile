import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import HapticPressable from '@/components/HapticPressable';
import PagerView from 'react-native-pager-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
import { Colors, AppColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSegments } from 'expo-router';
import { CurrentTabProvider, OwnTabIndexProvider } from '@/lib/contexts/TabVisibilityContext';
import * as Haptics from 'expo-haptics';

interface TabConfig {
  name: string;
  title: string;
  icon: any; // Icon name from IconSymbol (active/filled state)
  iconOutline?: any; // Icon name for inactive/outline state
  component: React.ComponentType<any>;
  showBadge?: boolean;
}

interface SwipeableTabsProps {
  tabs: TabConfig[];
  initialPage?: number;
}

// Memoized page wrapper prevents heavy tab screens from re-rendering
// when only the currentPage state changes (i.e. icon/haptic updates).
// OwnTabIndexProvider gives each page its index so nested components
// can call useIsTabVisible() without knowing their tab index.
const TabPage = React.memo(({ component: Component, index }: { component: React.ComponentType<any>; index: number }) => (
  <OwnTabIndexProvider value={index}>
    <Component />
  </OwnTabIndexProvider>
));

export default function SwipeableTabs({ tabs, initialPage = 0 }: SwipeableTabsProps) {
  const colorScheme = useColorScheme();
  const pagerRef = useRef<PagerView>(null);
  const segments = useSegments();
  const [currentPage, setCurrentPage] = useState(initialPage);
  const lastHapticPage = useRef(initialPage);

  // Listen to route changes and switch tabs accordingly
  useEffect(() => {
    const tabSegment = segments[1];

    if (tabSegment) {
      const tabIndex = tabs.findIndex(tab => tab.name === tabSegment);
      if (tabIndex !== -1 && tabIndex !== currentPage) {
        pagerRef.current?.setPage(tabIndex);
        setCurrentPage(tabIndex);
        lastHapticPage.current = tabIndex;
      }
    }
  }, [segments]);

  // Handle tab press - navigate to page (haptic feedback handled by HapticPressable)
  const handleTabPress = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
    setCurrentPage(index);
    lastHapticPage.current = index;
  }, []);

  // Fires continuously during swipe — update icons as soon as we cross the midpoint
  const handlePageScroll = useCallback((e: any) => {
    const { position, offset } = e.nativeEvent;
    // Determine which page the user is closest to
    const nearestPage = offset > 0.5 ? position + 1 : position;
    const clampedPage = Math.max(0, Math.min(nearestPage, tabs.length - 1));

    if (clampedPage !== lastHapticPage.current) {
      lastHapticPage.current = clampedPage;
      setCurrentPage(clampedPage);

      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [tabs.length]);

  // Final confirmation when page settles
  const handlePageSelected = useCallback((e: any) => {
    const { position } = e.nativeEvent;
    if (position !== currentPage) {
      setCurrentPage(position);
    }
    lastHapticPage.current = position;
  }, [currentPage]);

  return (
    <CurrentTabProvider value={currentPage}>
    <View style={styles.container}>
      {/* Swipeable Content */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={initialPage}
        onPageScroll={handlePageScroll}
        onPageSelected={handlePageSelected}
        overdrag={true}
        pageMargin={0}
      >
        {tabs.map((tab, index) => (
          <View key={tab.name} style={styles.page}>
            <TabPage component={tab.component} index={index} />
          </View>
        ))}
      </PagerView>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        {tabs.map((tab, index) => {
          const isActive = currentPage === index;
          const activeColor = Colors[colorScheme ?? 'light'].tint;
          const inactiveColor = Colors[colorScheme ?? 'light'].tabIconDefault;

          return (
            <HapticPressable
              key={tab.name}
              style={styles.tabButton}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.7}
              hapticStyle="selection"
            >
              <View style={styles.tabIconContainer}>
                <IconSymbol
                  size={28}
                  name={isActive ? tab.icon : (tab.iconOutline ?? tab.icon)}
                  color={isActive ? activeColor : inactiveColor}
                />
                {tab.showBadge && (
                  <View style={styles.badgeBubble}>
                    <Ionicons name="chatbubble-ellipses" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </HapticPressable>
          );
        })}
      </View>
    </View>
    </CurrentTabProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 84,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabIconContainer: {
    position: 'relative',
  },
  badgeBubble: {
    position: 'absolute',
    top: -6,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.success,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
