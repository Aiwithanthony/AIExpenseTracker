import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

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
    scale.value = withSpring(scaleValue, SPRING_CONFIG);
    opacity.value = withSpring(pressedOpacity, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withSpring(1, SPRING_CONFIG);
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
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default AnimatedPressable;
