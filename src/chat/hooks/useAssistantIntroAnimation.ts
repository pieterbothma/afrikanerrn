import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Options = {
  disabled: boolean;
  trigger?: SharedValue<boolean>;
};

export function useAssistantIntroAnimation({ disabled, trigger }: Options) {
  const opacity = useSharedValue(disabled ? 1 : 0);

  useAnimatedReaction(
    () => {
      if (disabled) {
        return 0;
      }
      return trigger?.value ? 1 : 0;
    },
    (shouldAnimate, previous) => {
      if (!shouldAnimate || shouldAnimate === previous) {
        return;
      }
      opacity.value = withTiming(1, { duration: 360 });
    },
  );

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { style };
}

