import { useEffect, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, View, Alert, Linking, Animated as RNAnimated } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { ChatMessage } from '@/store/chatStore';
import { useChatStore } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';
import { formatBytes } from '@/lib/utils';
import MarkdownMessage from './MarkdownMessage';
import { useFirstMessageAnimation } from '@/chat/hooks/useFirstMessageAnimation';
import { useAssistantIntroAnimation } from '@/chat/hooks/useAssistantIntroAnimation';

// Animated typing dots indicator
function TypingIndicator() {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: RNAnimated.Value, delay: number) => {
      return RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          RNAnimated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: RNAnimated.Value) => ({
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View className="flex-row items-center gap-1 py-1">
      <RNAnimated.View
        style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#DE7356' }, dotStyle(dot1)]}
      />
      <RNAnimated.View
        style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#DE7356' }, dotStyle(dot2)]}
      />
      <RNAnimated.View
        style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#DE7356' }, dotStyle(dot3)]}
      />
    </View>
  );
}

type ChatBubbleProps = {
  message: ChatMessage;
  index: number;
};

const ACCENT_COLOR = '#DE7356'; // Copper
const TEXT_COLOR_USER = '#F7F3EE'; // Ivory
const TEXT_COLOR_BOT = '#1A1A1A'; // Charcoal

const formatTimestamp = (iso: string) => {
  try {
    const date = new Date(iso);
    return Intl.DateTimeFormat('af-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
};

export default function ChatBubble({ message, index }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const timestamp = formatTimestamp(message.createdAt);
  const user = useUserStore((state) => state.user);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const saveMessageToSupabase = useChatStore((state) => state.saveMessageToSupabase);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  const imageSource = message.previewUri || message.imageUri;
  const hasDocument = message.documentUrl && message.documentName;

  useEffect(() => {
    if (imageSource) {
      Image.getSize(
        imageSource,
        (width, height) => {
          if (width && height) {
            setImageAspectRatio(width / height);
          }
        },
        (error) => {
          console.log('Failed to get image size:', error);
        }
      );
    }
  }, [imageSource]);

  const handleToggleFavorite = async () => {
    if (!user?.id) {
      return;
    }

    const newFavorite = !message.isFavorite;
    updateMessage(message.id, { isFavorite: newFavorite });

    const updated = { ...message, isFavorite: newFavorite };
    await supabase
      .from('messages')
      .update({ is_favorite: newFavorite })
      .eq('id', message.id);

    await saveMessageToSupabase(updated, user.id);
  };

  const handleTogglePinned = async () => {
    if (!user?.id) {
      return;
    }

    const newPinned = !message.isPinned;
    updateMessage(message.id, { isPinned: newPinned });

    const updated = { ...message, isPinned: newPinned };
    await supabase
      .from('messages')
      .update({ is_pinned: newPinned })
      .eq('id', message.id);

    await saveMessageToSupabase(updated, user.id);
  };

  const handleLongPress = () => {
    Alert.alert(
      'Boodskap opsies',
      '',
      [
        {
          text: message.isFavorite ? 'Verwyder uit gunstelinge' : 'Voeg by gunstelinge',
          onPress: handleToggleFavorite,
        },
        {
          text: message.isPinned ? 'Ontspeld' : 'Speld vas',
          onPress: handleTogglePinned,
        },
        { text: 'Kanselleer', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const handleDocumentPress = async () => {
    if (message.documentUrl) {
      try {
        const canOpen = await Linking.canOpenURL(message.documentUrl);
        if (canOpen) {
          await Linking.openURL(message.documentUrl);
        } else {
          Alert.alert('Oeps!', 'Kon nie dokument oopmaak nie.');
        }
      } catch (error) {
        console.error('Kon nie dokument oopmaak nie:', error);
        Alert.alert('Oeps!', 'Kon nie dokument oopmaak nie.');
      }
    }
  };

  // Text colors for icons
  const iconColor = isUser ? TEXT_COLOR_USER : ACCENT_COLOR;

  const isFirstUserMessage = isUser && index === 0;
  const isFirstAssistantMessage = !isUser && index === 1;
  const { style: userAnimationStyle, didUserMessageAnimate } = useFirstMessageAnimation({
    disabled: !isFirstUserMessage,
  });
  const { style: assistantAnimationStyle } = useAssistantIntroAnimation({
    disabled: !isFirstAssistantMessage,
    trigger: didUserMessageAnimate,
  });
  const animatedStyle = isUser ? userAnimationStyle : assistantAnimationStyle;

  return (
    <View className={`w-full my-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={0.8}
          className={`max-w-[85%] rounded-2xl px-4 py-3 border-2 border-borderBlack ${
            isUser ? 'bg-copper rounded-tr-sm' : 'bg-ivory rounded-tl-sm'
          }`}
        >
        {/* Media attachments shown first */}
        {imageSource ? (
          <View className="mb-3 overflow-hidden rounded-xl border-2 border-black/10 bg-black/5">
            <Image
              source={{ uri: imageSource }}
              className="w-full"
              style={{ 
                aspectRatio: imageAspectRatio,
                maxHeight: 400 
              }}
              resizeMode="cover"
            />
          </View>
        ) : null}
        {hasDocument ? (
          <TouchableOpacity
            className={`mb-3 rounded-xl border-2 p-4 flex-row items-center ${
              isUser ? 'border-white/20 bg-black/10' : 'border-borderBlack bg-sand'
            }`}
            onPress={handleDocumentPress}
            activeOpacity={0.7}
          >
            <View className={`w-12 h-12 rounded-lg items-center justify-center mr-3 border border-black/10 ${
              isUser ? 'bg-white/20' : 'bg-white'
            }`}>
              <Ionicons name="document-text" size={24} color={isUser ? '#FFFFFF' : ACCENT_COLOR} />
            </View>
            <View className="flex-1">
              <Text className={`font-bold text-base ${isUser ? 'text-ivory' : 'text-charcoal'}`} numberOfLines={1}>
                {message.documentName}
              </Text>
              {message.documentSize && (
                <Text className={`text-xs ${isUser ? 'text-white/80' : 'text-charcoal/70'} mt-0.5`}>
                  {formatBytes(message.documentSize)}
                </Text>
              )}
            </View>
            <Ionicons name="open-outline" size={20} color={isUser ? '#FFFFFF' : ACCENT_COLOR} />
          </TouchableOpacity>
        ) : null}
        
        {/* Text content shown after media, with visual separation if both exist */}
        {message.content.length > 0 ? (
          <View className={imageSource || hasDocument ? 'mt-2' : ''}>
            <MarkdownMessage content={message.content} isUser={isUser} />
          </View>
        ) : !isUser && !imageSource && !hasDocument ? (
          // Show typing indicator for assistant messages with no content (thinking)
          <TypingIndicator />
        ) : null}
        
        {/* Show indicator if media-only message */}
        {!message.content && (imageSource || hasDocument) && (
          <Text className={`text-xs ${isUser ? 'text-white/60' : 'text-charcoal/60'} italic mt-1`}>
            {imageSource ? 'Foto gestuur' : hasDocument ? 'Dokument gestuur' : ''}
          </Text>
        )}
        {(message.isFavorite || message.isPinned) && (
          <View className="mt-2 flex-row items-center gap-2">
            {message.isFavorite && (
              <Ionicons name="star" size={14} color={iconColor} />
            )}
            {message.isPinned && (
              <Ionicons name="pin" size={14} color={iconColor} />
            )}
          </View>
        )}
        </TouchableOpacity>
      </Animated.View>
      {timestamp ? (
        <Text className={`mt-1 font-medium text-[10px] text-[#6A6A6A] ${isUser ? 'mr-1 text-right' : 'ml-1 text-left'}`}>
          {timestamp}
        </Text>
      ) : null}
    </View>
  );
}
