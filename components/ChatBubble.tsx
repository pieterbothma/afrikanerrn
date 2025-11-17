import { Image, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ChatMessage } from '@/store/chatStore';
import { useChatStore } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';

type ChatBubbleProps = {
  message: ChatMessage;
};

const ACCENT = '#DE7356';

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

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const timestamp = formatTimestamp(message.createdAt);
  const user = useUserStore((state) => state.user);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const saveMessageToSupabase = useChatStore((state) => state.saveMessageToSupabase);

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

  return (
    <TouchableOpacity
      className={`w-full ${isUser ? 'items-end' : 'items-start'}`}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? 'bg-accent' : 'bg-card border border-border'
        }`}
      >
        {message.imageUri ? (
          <Image source={{ uri: message.imageUri }} className="mb-3 h-40 w-full rounded-lg" />
        ) : null}
        {message.content.length > 0 ? (
          <Text className={`font-normal text-base leading-6 ${isUser ? 'text-white' : 'text-foreground'}`}>
            {message.content}
          </Text>
        ) : null}
        {(message.isFavorite || message.isPinned) && (
          <View className="mt-2 flex-row items-center gap-2">
            {message.isFavorite && (
              <Ionicons name="star" size={14} color={isUser ? '#FFFFFF' : ACCENT} />
            )}
            {message.isPinned && (
              <Ionicons name="pin" size={14} color={isUser ? '#FFFFFF' : ACCENT} />
            )}
          </View>
        )}
      </View>
      {timestamp ? (
        <Text className="mt-1.5 font-normal text-xs text-muted">{timestamp}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

