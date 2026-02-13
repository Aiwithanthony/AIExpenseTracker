import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';

const HEADER_HEIGHT = 250;

interface ParallaxScrollViewProps {
  children: React.ReactNode;
  headerContent: React.ReactNode;
}

const ParallaxScrollView: React.FC<ParallaxScrollViewProps> = ({ children, headerContent }) => {
  const scrollY = useSharedValue(0);
  const { height: windowHeight } = useWindowDimensions();

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-HEADER_HEIGHT, 0],
      [2, 1],
      'clamp'
    );
    return {
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        {headerContent}
      </Animated.View>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    width: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6A0DAD', // Your accent color
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
});

export default ParallaxScrollView;