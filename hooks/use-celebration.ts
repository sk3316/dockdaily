import { useRef } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

export function useCelebration() {
  const flashAnims = useRef<Map<string, Animated.Value>>(new Map()).current;
  const scaleAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  const getFlashAnim = (id: string) => {
    if (!flashAnims.has(id)) flashAnims.set(id, new Animated.Value(0));
    return flashAnims.get(id)!;
  };

  const getScaleAnim = (id: string) => {
    if (!scaleAnims.has(id)) scaleAnims.set(id, new Animated.Value(1));
    return scaleAnims.get(id)!;
  };

  const celebrate = (id: string) => {
    const flash = getFlashAnim(id);
    const scale = getScaleAnim(id);

    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 800, useNativeDriver: false }).start();

    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return { getFlashAnim, getScaleAnim, celebrate };
}