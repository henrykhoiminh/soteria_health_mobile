import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Dimensions,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSegments } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface TabConfig {
  name: string;
  title: string;
  icon: any; // Icon name from IconSymbol
  component: React.ComponentType<any>;
}

interface SwipeableTabsProps {
  tabs: TabConfig[];
  initialPage?: number;
}

export default function SwipeableTabs({ tabs, initialPage = 0 }: SwipeableTabsProps) {
  const colorScheme = useColorScheme();
  const pagerRef = useRef<PagerView>(null);
  const segments = useSegments();
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Listen to route changes and switch tabs accordingly
  useEffect(() => {
    // Get the tab segment (e.g., 'index', 'routines', 'builder', etc.)
    const tabSegment = segments[1]; // segments[0] is '(tabs)', segments[1] is the tab name

    if (tabSegment) {
      const tabIndex = tabs.findIndex(tab => tab.name === tabSegment);
      if (tabIndex !== -1 && tabIndex !== currentPage) {
        pagerRef.current?.setPage(tabIndex);
        setCurrentPage(tabIndex);
      }
    }
  }, [segments]);

  // Handle tab press - navigate to page with haptic feedback
  const handleTabPress = (index: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    pagerRef.current?.setPage(index);
    setCurrentPage(index);
  };

  // Handle page change from swipe
  const handlePageSelected = (e: any) => {
    const { position } = e.nativeEvent;
    setCurrentPage(position);

    // Haptic feedback on page change
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={styles.container}>
      {/* Swipeable Content */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={initialPage}
        onPageSelected={handlePageSelected}
        scrollEnabled={scrollEnabled}
        overdrag={true}
        // iOS-like feel
        pageMargin={0}
      >
        {tabs.map((tab, index) => (
          <View key={tab.name} style={styles.page}>
            <tab.component />
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
            <TouchableOpacity
              key={tab.name}
              style={styles.tabButton}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.7}
            >
              <IconSymbol
                size={28}
                name={tab.icon}
                color={isActive ? activeColor : inactiveColor}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? activeColor : inactiveColor },
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
