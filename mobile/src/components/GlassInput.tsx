import React from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
  Text,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

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

const GLASS = {
  borderColor: 'rgba(255, 255, 255, 0.2)',
  bgLight: 'rgba(255, 255, 255, 0.08)',
};

const GlassInput: React.FC<GlassInputProps> = ({
  label,
  labelColor = '#98989d',
  textColor = '#FFFFFF',
  placeholderColor = 'rgba(255,255,255,0.4)',
  isDark = true,
  containerStyle,
  style,
  ...textInputProps
}) => {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
      <BlurView
        intensity={isDark ? 40 : 25}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark
              ? GLASS.bgLight
              : 'rgba(255, 255, 255, 0.6)',
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: textColor }, style]}
          placeholderTextColor={placeholderColor}
          {...textInputProps}
        />
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GLASS.borderColor,
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
