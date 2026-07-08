import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Scale value when pressed (0-1). Default: 0.96 */
  scaleValue?: number;
  /** Opacity when pressed. Default: 0.85 */
  pressedOpacity?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

// Exponential ease-out (quart) — natural deceleration, no bounce
const EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);
const PRESS_DURATION = 100;   // Fast response on press-in
const RELEASE_DURATION = 300; // Smooth deceleration on release

let reduceMotionEnabled = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotionEnabled = v; });

const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  scaleValue = 0.96,
  pressedOpacity = 0.85,
  style,
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (reduceMotionEnabled) {
      opacity.value = withTiming(pressedOpacity, { duration: 50 });
      return;
    }
    scale.value = withTiming(scaleValue, { duration: PRESS_DURATION, easing: EASE_OUT });
    opacity.value = withTiming(pressedOpacity, { duration: PRESS_DURATION, easing: EASE_OUT });
  };

  const handlePressOut = () => {
    if (reduceMotionEnabled) {
      opacity.value = withTiming(1, { duration: 100 });
      return;
    }
    scale.value = withTiming(1, { duration: RELEASE_DURATION, easing: EASE_OUT });
    opacity.value = withTiming(1, { duration: RELEASE_DURATION, easing: EASE_OUT });
  };

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onLongPress={disabled ? undefined : onLongPress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        disabled={disabled}
        style={{ flex: style ? undefined : 1 }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default AnimatedPressable;
