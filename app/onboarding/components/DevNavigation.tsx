import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, ScrollView } from 'react-native';

// Onboarding screen order for navigation (matches actual flow)
const SCREEN_ORDER = [
  { path: '/onboarding', label: '1. Value Prop' },
  { path: '/onboarding/finding-soteria', label: '2. Finding Soteria' },
  { path: '/onboarding/three-lights', label: '3. Three Lights' },
  { path: '/onboarding/mind-extraction', label: '4. Mind Extraction' },
  { path: '/onboarding/body-extraction', label: '5. Body Extraction' },
  { path: '/onboarding/soul-extraction', label: '6. Soul Extraction' },
  { path: '/onboarding/introduce-yourself', label: '7. Introduce Yourself' },
  { path: '/onboarding/traveler-name', label: '8. Username' },
  { path: '/onboarding/the-pact', label: '9. The Pact' },
];

// Set to false to hide dev navigation
const DEV_MODE = true;

export default function DevNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [showPicker, setShowPicker] = useState(false);

  if (!DEV_MODE) return null;

  const currentIndex = SCREEN_ORDER.findIndex(s => s.path === pathname);
  const currentScreen = SCREEN_ORDER[currentIndex];
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < SCREEN_ORDER.length - 1;

  const goBack = () => {
    if (canGoBack) {
      router.replace(SCREEN_ORDER[currentIndex - 1].path);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      router.replace(SCREEN_ORDER[currentIndex + 1].path);
    }
  };

  const goToScreen = (path: string) => {
    setShowPicker(false);
    router.replace(path);
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.navButton, !canGoBack && styles.disabled]}
          onPress={goBack}
          disabled={!canGoBack}
        >
          <Ionicons name="chevron-back" size={16} color={canGoBack ? '#fff' : '#666'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.screenLabel} onPress={() => setShowPicker(true)}>
          <Text style={styles.screenText}>
            {currentScreen?.label || pathname}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#888" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, !canGoForward && styles.disabled]}
          onPress={goForward}
          disabled={!canGoForward}
        >
          <Ionicons name="chevron-forward" size={16} color={canGoForward ? '#fff' : '#666'} />
        </TouchableOpacity>
      </View>

      <Modal visible={showPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>Jump to Screen</Text>
            <ScrollView style={styles.pickerScroll}>
              {SCREEN_ORDER.map((screen, index) => (
                <TouchableOpacity
                  key={screen.path}
                  style={[
                    styles.pickerItem,
                    index === currentIndex && styles.pickerItemActive,
                  ]}
                  onPress={() => goToScreen(screen.path)}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      index === currentIndex && styles.pickerItemTextActive,
                    ]}
                  >
                    {screen.label}
                  </Text>
                  {index === currentIndex && (
                    <Ionicons name="checkmark" size={16} color="#F7DD6F" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    gap: 8,
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  screenLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  screenText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    backgroundColor: '#1A1A1F',
    borderRadius: 16,
    padding: 16,
    width: '80%',
    maxHeight: '70%',
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(247, 221, 111, 0.1)',
  },
  pickerItemText: {
    color: '#888',
    fontSize: 14,
  },
  pickerItemTextActive: {
    color: '#F7DD6F',
    fontWeight: '600',
  },
});
