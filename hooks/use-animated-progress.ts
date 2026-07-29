import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { SuccessColor } from '@/constants/theme';

export function useAnimatedProgress(progress: number, baseColor: string) {
  const anim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 400, useNativeDriver: false }).start();
  }, [progress]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const backgroundColor = anim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [baseColor, baseColor, SuccessColor],
  });

  return { width, backgroundColor };
}