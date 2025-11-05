import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JourneyFocus } from '@/types';
import { AppColors, CardElevation } from '@/constants/theme';

interface JourneyBadgeProps {
  focus: JourneyFocus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  recoveryAreas?: string[];
}

export default function JourneyBadge({
  focus,
  size = 'md',
  showLabel = true,
  recoveryAreas = []
}: JourneyBadgeProps) {
  // Determine icon and color based on journey focus
  const isRecovery = focus === 'Recovery';
  const iconName = isRecovery ? 'heart' : 'shield-checkmark';
  const color = isRecovery ? AppColors.body : AppColors.mind; // Red for Recovery, Blue for Prevention

  // Size configurations
  const sizeConfig = {
    sm: {
      containerPadding: 8,
      iconSize: 16,
      labelSize: 12,
      iconMargin: 4,
    },
    md: {
      containerPadding: 12,
      iconSize: 20,
      labelSize: 14,
      iconMargin: 6,
    },
    lg: {
      containerPadding: 16,
      iconSize: 24,
      labelSize: 16,
      iconMargin: 8,
    },
  };

  const config = sizeConfig[size];

  // Format label text
  const getLabel = () => {
    if (recoveryAreas && recoveryAreas.length > 0 && isRecovery) {
      // Show first area if only one, or count if multiple
      if (recoveryAreas.length === 1) {
        return `${focus} - ${recoveryAreas[0]}`;
      }
      return `${focus} - ${recoveryAreas.length} areas`;
    }
    return focus;
  };

  return (
    <View
      style={[
        styles.container,
        {
          padding: config.containerPadding,
          borderColor: color,
        },
      ]}
    >
      <Ionicons name={iconName} size={config.iconSize} color={color} />
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: config.labelSize,
              color: color,
              marginLeft: config.iconMargin,
            },
          ]}
        >
          {getLabel()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    ...CardElevation, // Already includes borderWidth: 1
    alignSelf: 'flex-start', // Don't stretch to full width
  },
  label: {
    fontWeight: '600',
  },
});
