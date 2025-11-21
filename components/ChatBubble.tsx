import { Image, Text, TouchableOpacity, View, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ChatMessage } from '@/store/chatStore';
import { useChatStore } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';
import { formatBytes } from '@/lib/utils';
import MarkdownMessage from './MarkdownMessage';

type ChatBubbleProps = {
  message: ChatMessage;
};

const ACCENT = '#B46E3A';

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

  const imageSource = message.previewUri || message.imageUri;
  const hasDocument = message.documentUrl && message.documentName;

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
        style={!isUser ? { backgroundColor: '#121212' } : undefined}
      >
        {imageSource ? (
          <View className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <Image
              source={{ uri: imageSource }}
              className="w-full"
              style={{ height: 300, maxHeight: 400 }}
              resizeMode="contain"
            />
          </View>
        ) : null}
        {hasDocument ? (
          <TouchableOpacity
            className="mb-3 rounded-xl border border-white/10 bg-black/20 p-4 flex-row items-center"
            onPress={handleDocumentPress}
            activeOpacity={0.7}
          >
            <View className="w-12 h-12 rounded-xl bg-accent/20 items-center justify-center mr-3">
              <Ionicons name="document-text" size={24} color={isUser ? '#FFFFFF' : ACCENT} />
            </View>
            <View className="flex-1">
              <Text className={`font-semibold text-base ${isUser ? 'text-white' : 'text-foreground'}`} numberOfLines={1}>
                {message.documentName}
              </Text>
              {message.documentSize && (
                <Text className={`text-xs ${isUser ? 'text-white/70' : 'text-muted'} mt-0.5`}>
                  {formatBytes(message.documentSize)}
                </Text>
              )}
            </View>
            <Ionicons name="open-outline" size={20} color={isUser ? '#FFFFFF' : ACCENT} />
          </TouchableOpacity>
        ) : null}
        {message.content.length > 0 ? <MarkdownMessage content={message.content} isUser={isUser} /> : null}
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
