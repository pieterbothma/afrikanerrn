import {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useChatContext } from '../ChatContext';

type Options = {
  disabled: boolean;
};

export function useFirstMessageAnimation({ disabled }: Options) {
  const { isMessageSendAnimating } = useChatContext();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(disabled ? 1 : 0);
  const progress = useSharedValue(disabled ? 1 : -1);

  useAnimatedReaction(
    () => (!disabled && isMessageSendAnimating.value ? 1 : 0),
    (shouldAnimate) => {
      if (!shouldAnimate) {
        return;
      }
      translateY.value = 24;
      opacity.value = 0;
      progress.value = 0;
      translateY.value = withSpring(0, { damping: 14, stiffness: 180 });
      opacity.value = withTiming(
        1,
        { duration: 420, easing: Easing.out(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished) {
            progress.value = 1;
            isMessageSendAnimating.value = false;
          }
        },
      );
    },
  );

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const didUserMessageAnimate = useDerivedValue(() => progress.value === 1);

  return { style, didUserMessageAnimate };
}

