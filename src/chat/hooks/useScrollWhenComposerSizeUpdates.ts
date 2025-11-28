import { useCallback } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';

import { useChatContext } from '../ChatContext';

export function useScrollWhenComposerSizeUpdates(isNearEnd: SharedValue<number>) {
  const { composerHeight, scrollToEnd } = useChatContext();

  const autoScroll = useCallback(() => {
    scrollToEnd({ animated: false });
  }, [scrollToEnd]);

  useAnimatedReaction(
    () => composerHeight.value,
    (height, previousHeight) => {
      if (height === previousHeight) {
        return;
      }
      if (isNearEnd.value >= 0.5) {
        runOnJS(autoScroll)();
      }
    },
  );
}

