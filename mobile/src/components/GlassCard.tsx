import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import AnimatedPressable from './AnimatedPressable';

interface GlassCardProps {
  children: React.ReactNode;
  /** Additional styles applied to the outer card container */
  style?: StyleProp<ViewStyle>;
  /** Blur intensity (kept for API compat but unused in bento style) */
  intensity?: number;
  /** Tint (kept for API compat, used to derive card style) */
  tint?: 'light' | 'dark' | 'default';
  /** If provided, the card becomes pressable with animated feedback */
  onPress?: () => void;
  /** Active opacity for press state when onPress is provided. Default: 0.9 */
  activeOpacity?: number;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  tint = 'dark',
  onPress,
}) => {
  const isDark = tint === 'dark';

  const content = (
    <View
      style={[
        styles.card,
        isDark ? styles.cardDark : styles.cardLight,
        style,
      ]}
    >
      {children}
    </View>
  );

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
    borderRadius: 18,
    overflow: 'hidden',
    padding: 16,
    ...Platform.select({
      ios: {
        // Warm-hued soft shadow so cards sit gently on the cream canvas
        shadowColor: '#5E4A36',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 74, 54, 0.08)',
  },
  cardDark: {
    backgroundColor: '#211D18',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 240, 220, 0.08)',
  },
  pressableWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
  },
});

export default GlassCard;
