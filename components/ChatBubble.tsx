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

  // Text colors for icons
  const iconColor = isUser ? TEXT_COLOR_USER : ACCENT_COLOR;

  return (
    <View className={`w-full my-2 ${isUser ? 'items-end' : 'items-start'}`}>
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
              style={{ height: 300, maxHeight: 400 }}
              resizeMode="contain"
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
      {timestamp ? (
        <Text className={`mt-1 font-medium text-[10px] text-[#6A6A6A] ${isUser ? 'mr-1 text-right' : 'ml-1 text-left'}`}>
          {timestamp}
        </Text>
      ) : null}
    </View>
  );
}
