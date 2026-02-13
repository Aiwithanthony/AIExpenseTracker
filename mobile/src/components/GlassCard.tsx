import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import AnimatedPressable from './AnimatedPressable';

interface GlassCardProps {
  children: React.ReactNode;
  /** Additional styles applied to the outer card container */
  style?: StyleProp<ViewStyle>;
  /** Blur intensity (0-100). Default: 60 */
  intensity?: number;
  /** Blur tint. Default: 'dark' */
  tint?: 'light' | 'dark' | 'default';
  /** If provided, the card becomes pressable with animated feedback */
  onPress?: () => void;
  /** Active opacity for press state when onPress is provided. Default: 0.9 */
  activeOpacity?: number;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 60,
  tint = 'dark',
  onPress,
  activeOpacity = 0.9,
}) => {
  const content = (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[styles.card, style]}
    >
      {children}
    </BlurView>
  );

  // Wrap in AnimatedPressable if onPress is provided
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.97}
        style={styles.pressableWrapper}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
  },
  pressableWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default GlassCard;
