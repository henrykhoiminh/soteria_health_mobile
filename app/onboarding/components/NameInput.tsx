import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AppColors } from '@/constants/theme';

interface NameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suggestions?: string[];
  maxLength?: number;
  label?: string;
  helperText?: string;
  autoFocus?: boolean;
}

export default function NameInput({
  value,
  onChangeText,
  placeholder = 'Enter a name',
  suggestions = [],
  maxLength = 12,
  label,
  helperText,
  autoFocus = false,
}: NameInputProps) {
  const handleSuggestionPress = (suggestion: string) => {
    onChangeText(suggestion);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={AppColors.textTertiary}
        maxLength={maxLength}
        autoFocus={autoFocus}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {/* Character count */}
      <Text style={styles.charCount}>
        {value.length}/{maxLength}
      </Text>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>Suggestions:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.suggestionChip,
                  value === suggestion && styles.suggestionChipActive,
                ]}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text
                  style={[
                    styles.suggestionText,
                    value === suggestion && styles.suggestionTextActive,
                  ]}
                >
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {helperText && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.surface,
    borderWidth: 2,
    borderColor: AppColors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  charCount: {
    fontSize: 12,
    color: AppColors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: AppColors.textTertiary,
    marginBottom: 8,
  },
  suggestionsScroll: {
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  suggestionChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  suggestionTextActive: {
    color: AppColors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: AppColors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
});
