import { useRef } from 'react';
import { Animated, Easing, LayoutAnimation, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Fade in with upward translation
 */
export function fadeInUp(
  value: Animated.Value,
  duration: number = 400,
  delay: number = 0,
  translateY: number = 16
) {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    delay,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
}

/**
 * Create an animated value for fade-in-up
 */
export function createFadeInUp(delay: number = 0) {
  const opacity = new Animated.Value(0);
  const translateY = new Animated.Value(16);

  const start = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { opacity, translateY, start };
}

/**
 * Scale animation for press interactions
 */
export function scaleOnPress(
  scaleValue: Animated.Value,
  toValue: number = 0.97,
  duration: number = 100
) {
  return Animated.timing(scaleValue, {
    toValue,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
}

/**
 * Create pressable scale animation handlers
 */
export function usePressableScale(initialScale: number = 1, pressScale: number = 0.97) {
  const scaleValueRef = useRef(new Animated.Value(initialScale));

  const onPressIn = () => {
    scaleOnPress(scaleValueRef.current, pressScale, 100).start();
  };

  const onPressOut = () => {
    scaleOnPress(scaleValueRef.current, initialScale, 150).start();
  };

  return { scaleValue: scaleValueRef.current, onPressIn, onPressOut };
}

/**
 * Stagger children animation
 */
export function staggerChildren(
  values: Animated.Value[],
  duration: number = 400,
  staggerDelay: number = 50
) {
  return Animated.stagger(
    staggerDelay,
    values.map((value) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    )
  );
}

/**
 * Create stagger fade-in-up values for a list
 */
export function createStaggerAnimations(count: number, baseDelay: number = 0) {
  const animations = Array.from({ length: count }, (_, i) => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(12),
    delay: baseDelay + i * 50,
  }));

  const start = () => {
    Animated.stagger(
      50,
      animations.flatMap((anim) => [
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          delay: anim.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 400,
          delay: anim.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return { animations, start };
}

/**
 * Shimmer animation for skeletons
 */
export function createShimmer() {
  const shimmerValue = new Animated.Value(-1);

  const start = () => {
    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const stop = () => {
    shimmerValue.stopAnimation();
  };

  return { shimmerValue, start, stop };
}

/**
 * Configure layout animation for list changes
 */
export function configureListAnimation(type: 'easeInEaseOut' | 'spring' = 'easeInEaseOut') {
  LayoutAnimation.configureNext(
    type === 'spring'
      ? LayoutAnimation.Presets.spring
      : LayoutAnimation.Presets.easeInEaseOut
  );
}

/**
 * Pulse subtle animation
 */
export function createPulse() {
  const pulseValue = new Animated.Value(1);

  const start = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 0.92,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stop = () => {
    pulseValue.stopAnimation();
  };

  return { pulseValue, start, stop };
}

/**
 * 页面级转场（用于 React Navigation Stack.Screen options）
 * 保持与现有 fadeInUp / scaleOnPress 一致的时序和缓动
 */
export const screenTransitions = {
  slideFromRight: { animation: 'slide_from_right' as const, duration: 220 },
  fade:           { animation: 'fade' as const,               duration: 180 },
  modal:          { animation: 'slide_from_bottom' as const, duration: 260 },
  none:           { animation: 'fade' as const,               duration: 0 },
};

/**
 * 列表项入场 hook（按 index 错开）
 * 解决：各屏幕列表"瞬间出现"无节奏感
 * @param index 当前项索引
 * @param staggerMs 每项间隔（默认 40ms，体感最佳）
 * @param maxIndex 超过该索引的项不再延迟（防止长列表卡顿）
 */
export function useStaggerFadeIn(index: number, staggerMs: number = 40, maxIndex: number = 20) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const refs = useRef({ started: false });

  if (!refs.current.started) {
    refs.current.started = true;
    const delay = Math.min(index, maxIndex) * staggerMs;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }

  return { opacity, translateY };
}
