import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

// Category colors
const CATEGORY_COLORS = {
  Mind: '#3B82F6',   // Blue
  Body: '#EF4444',   // Red
  Soul: '#F59E0B',   // Gold/Amber
};

type CategoryType = 'Mind' | 'Body' | 'Soul';

interface NameSelectorProps {
  options: string[];
  selected: string | null;
  onSelect: (name: string) => void;
  category: CategoryType;
}

interface NameButtonProps {
  name: string;
  isSelected: boolean;
  onPress: () => void;
  categoryColor: string;
}

const NameButton: React.FC<NameButtonProps> = ({ name, isSelected, onPress, categoryColor }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      // Animate scale up and glow
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Animate back to normal
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isSelected, scaleAnim, glowAnim]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  // Convert hex color to rgba for background
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Interpolate glow for shadow and border using category color
  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.15)', categoryColor],
  });

  const backgroundColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.05)', hexToRgba(categoryColor, 0.15)],
  });

  return (
    <Animated.View
      style={[
        styles.buttonWrapper,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.nameButton,
            {
              borderColor,
              backgroundColor,
            },
          ]}
        >
          <Text style={[
            styles.nameText,
            isSelected && styles.nameTextSelected,
          ]}>
            {name}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const NameSelector: React.FC<NameSelectorProps> = ({ options, selected, onSelect, category }) => {
  const categoryColor = CATEGORY_COLORS[category];

  return (
    <View style={styles.container}>
      {options.map((name) => (
        <NameButton
          key={name}
          name={name}
          isSelected={selected === name}
          onPress={() => onSelect(name)}
          categoryColor={categoryColor}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  buttonWrapper: {
    flex: 1,
    maxWidth: 110,
  },
  nameButton: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  nameTextSelected: {
    color: '#FFFFFF',
  },
});

export default NameSelector;
