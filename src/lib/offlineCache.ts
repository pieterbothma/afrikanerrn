import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/store/chatStore';

const CACHE_KEYS = {
  MESSAGES: (userId: string, conversationId?: string) =>
    `messages_${userId}${conversationId ? `_${conversationId}` : ''}`,
  CONVERSATIONS: (userId: string) => `conversations_${userId}`,
  LAST_SYNC: (userId: string) => `last_sync_${userId}`,
};

export async function cacheMessages(userId: string, messages: ChatMessage[], conversationId?: string): Promise<void> {
  try {
    const key = CACHE_KEYS.MESSAGES(userId, conversationId);
    await AsyncStorage.setItem(key, JSON.stringify(messages));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC(userId), new Date().toISOString());
  } catch (error) {
    console.error('Kon nie boodskappe kas nie:', error);
  }
}

export async function getCachedMessages(
  userId: string,
  conversationId?: string,
): Promise<ChatMessage[] | null> {
  try {
    const key = CACHE_KEYS.MESSAGES(userId, conversationId);
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached) as ChatMessage[];
    }
    return null;
  } catch (error) {
    console.error('Kon nie gekaasde boodskappe laai nie:', error);
    return null;
  }
}

export async function clearCache(userId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter((key) => key.includes(userId));
    await AsyncStorage.multiRemove(userKeys);
  } catch (error) {
    console.error('Kon nie kas skoonmaak nie:', error);
  }
}

