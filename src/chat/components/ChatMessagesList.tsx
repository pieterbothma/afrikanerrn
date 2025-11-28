import React, { useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  RefreshControlProps,
  ViewStyle,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
} from 'react-native-reanimated';

import ChatBubble from '@/components/ChatBubble';
import type { ChatMessage } from '@/store/chatStore';

import { useChatContext } from '../ChatContext';
import { useInitialScrollToEnd } from '../hooks/useInitialScrollToEnd';
import { useScrollWhenComposerSizeUpdates } from '../hooks/useScrollWhenComposerSizeUpdates';

const SAFE_BOTTOM_PADDING = 4;

type ChatMessagesListProps = {
  messages: ChatMessage[];
  ListEmptyComponent: React.ReactElement | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  contentContainerStyle?: ViewStyle;
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<ChatMessage>);

export function ChatMessagesList({
  messages,
  ListEmptyComponent,
  isRefreshing,
  onRefresh,
  contentContainerStyle,
}: ChatMessagesListProps) {
  const { listRef } = useChatContext();
  const nearEnd = useSharedValue(1);

  useInitialScrollToEnd(messages.length > 0);
  useScrollWhenComposerSizeUpdates(nearEnd);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {
      contentSize: { height: totalHeight },
      contentOffset: { y },
      layoutMeasurement: { height: viewportHeight },
    } = event.nativeEvent;

    const distanceFromEnd = totalHeight - (y + viewportHeight);
    nearEnd.value = distanceFromEnd < 48 ? 1 : 0;
  };

  const refreshControl = useMemo<React.ReactElement<RefreshControlProps>>(
    () => (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        tintColor="#DE7356"
        colors={['#DE7356']}
      />
    ),
    [isRefreshing, onRefresh],
  );

  return (
    <AnimatedFlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={({ item, index }) => <ChatBubble message={item} index={index} />}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={refreshControl}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[
        { 
          paddingHorizontal: 16, 
          paddingTop: 8, 
          paddingBottom: SAFE_BOTTOM_PADDING,
        },
        contentContainerStyle,
      ]}
      ItemSeparatorComponent={null}
    />
  );
}

