import React from 'react';
import {
  TextInputProps,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { TextInput, Text } from './AppText';

interface GlassInputProps extends TextInputProps {
  /** Optional label displayed above the input */
  label?: string;
  /** Label text color */
  labelColor?: string;
  /** Input text color */
  textColor?: string;
  /** Placeholder text color */
  placeholderColor?: string;
  /** Whether the theme is dark */
  isDark?: boolean;
  /** Additional container style */
  containerStyle?: StyleProp<ViewStyle>;
}

const GlassInput: React.FC<GlassInputProps> = ({
  label,
  labelColor = '#8A7F73',
  textColor = '#2E2823',
  placeholderColor = '#B8AC9E',
  isDark = false,
  containerStyle,
  style,
  ...textInputProps
}) => {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? '#2B2620' : '#F4EDE3',
            borderColor: isDark ? 'rgba(255,240,220,0.08)' : 'rgba(94,74,54,0.08)',
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: textColor }, style]}
          placeholderTextColor={placeholderColor}
          {...textInputProps}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default GlassInput;
