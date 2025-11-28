import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { FlatList, Keyboard } from 'react-native';
import { useAnimatedRef, useSharedValue } from 'react-native-reanimated';

import type { ChatMessage } from '@/store/chatStore';

type ScrollToEndOptions = {
  animated?: boolean;
};

type ChatContextValue = {
  listRef: React.RefObject<FlatList<ChatMessage>>;
  blankSize: Animated.SharedValue<number>;
  composerHeight: Animated.SharedValue<number>;
  keyboardHeight: Animated.SharedValue<number>;
  isMessageSendAnimating: Animated.SharedValue<boolean>;
  hasScrolledToEnd: Animated.SharedValue<boolean>;
  scrollToEnd: (options?: ScrollToEndOptions) => void;
  setComposerHeight: (height: number) => void;
  setBlankSize: (size: number) => void;
  setMessageSendAnimating: (value: boolean) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: PropsWithChildren) {
  const listRef = useAnimatedRef<FlatList<ChatMessage>>();
  const blankSize = useSharedValue(0);
  const composerHeight = useSharedValue(0);
  const keyboardHeight = useSharedValue(0);
  const isMessageSendAnimating = useSharedValue(false);
  const hasScrolledToEnd = useSharedValue(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeight.value = event.endCoordinates?.height ?? 0;
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeight.value = 0;
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardHeight]);

  const scrollToEnd = useCallback(
    (options?: ScrollToEndOptions) => {
    const view = listRef.current;
    if (!view) {
      return;
    }
      view.scrollToEnd({ animated: options?.animated ?? true });
    },
    [listRef],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      listRef,
      blankSize,
      composerHeight,
      keyboardHeight,
      isMessageSendAnimating,
      hasScrolledToEnd,
      scrollToEnd,
      setComposerHeight: (height: number) => {
        composerHeight.value = height;
      },
      setBlankSize: (size: number) => {
        blankSize.value = Math.max(0, size);
      },
      setMessageSendAnimating: (value: boolean) => {
        isMessageSendAnimating.value = value;
      },
    }),
    [
      blankSize,
      composerHeight,
      keyboardHeight,
      isMessageSendAnimating,
      hasScrolledToEnd,
      scrollToEnd,
      listRef,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

