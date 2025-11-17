import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChatStore, Conversation } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';

const ACCENT = '#DE7356';

type MenuDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

const CATEGORIES = [
  { id: 'small-business', name: 'Klein Besigheid', icon: 'business' },
  { id: 'studies', name: 'Studies', icon: 'school' },
  { id: 'writing', name: 'Skryfwerk', icon: 'create' },
  { id: 'translation', name: 'Vertaling', icon: 'language' },
];

export default function MenuDrawer({ visible, onClose }: MenuDrawerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const conversations = useChatStore((state) => state.conversations);
  const loadConversations = useChatStore((state) => state.loadConversations);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const setCurrentConversationId = useChatStore((state) => state.setCurrentConversationId);
  const updateConversation = useChatStore((state) => state.updateConversation);
  const slideAnim = new Animated.Value(-300);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      slideAnim.setValue(-300);
    }
  }, [visible]);

  useEffect(() => {
    if (user?.id && visible) {
      loadConversations(user.id);
    }
  }, [user?.id, visible, loadConversations]);

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    onClose();
    router.push('/(tabs)');
  };

  const handleDeleteConversation = (conversationId: string, title: string | null) => {
    Alert.alert('Skrap gesprek', `Is jy seker jy wil "${title || 'Hierdie gesprek'}" skrap?`, [
      { text: 'Kanselleer', style: 'cancel' },
      {
        text: 'Skrap',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(conversationId);
          if (user?.id) {
            await loadConversations(user.id);
          }
        },
      },
    ]);
  };

  const handleStartEdit = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title || '');
  };

  const handleSaveEdit = async () => {
    if (editingId && editTitle.trim()) {
      await updateConversation(editingId, editTitle.trim());
      if (user?.id) {
        await loadConversations(user.id);
      }
      setEditingId(null);
      setEditTitle('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Net nou';
    }
    if (diffMins < 60) {
      return `${diffMins} min gelede`;
    }
    if (diffHours < 24) {
      return `${diffHours} uur gelede`;
    }
    if (diffDays < 7) {
      return `${diffDays} dae gelede`;
    }

    return date.toLocaleDateString('af-ZA', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable className="flex-1 flex-row" onPress={onClose}>
        <Animated.View
          style={{
            transform: [{ translateX: slideAnim }],
            width: 300,
            height: '100%',
          }}
          className="bg-background border-r border-border"
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="flex-1">
            <View
              className="px-6 pt-4 pb-4 border-b border-border"
              style={{ paddingTop: Math.max(insets.top, 16) }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-semibold text-xl text-foreground">Menu</Text>
                <TouchableOpacity onPress={onClose} className="p-2">
                  <Ionicons name="close" size={24} color="#2C2C2C" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="px-6 py-4">
                <Text className="font-semibold text-sm text-muted mb-3 uppercase">Jou Gesprekke</Text>
                {conversations.length === 0 ? (
                  <Text className="font-normal text-sm text-muted mb-4">Geen gesprekke</Text>
                ) : (
                  <View className="mb-6">
                    {conversations.map((conv) => (
                      <View key={conv.id} className="py-3 border-b border-border">
                        {editingId === conv.id ? (
                          <View className="flex-row items-center gap-2">
                            <TextInput
                              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-medium text-base text-foreground"
                              value={editTitle}
                              onChangeText={setEditTitle}
                              autoFocus
                              placeholder="Titel"
                              placeholderTextColor="#8E8EA0"
                            />
                            <TouchableOpacity onPress={handleSaveEdit} className="p-2">
                              <Ionicons name="checkmark" size={20} color={ACCENT} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCancelEdit} className="p-2">
                              <Ionicons name="close" size={20} color="#8E8EA0" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleSelectConversation(conv.id)}
                            className="flex-row items-start justify-between"
                          >
                            <View className="flex-1 mr-2">
                              <Text className="font-medium text-base text-foreground mb-1" numberOfLines={1}>
                                {conv.title || 'Geen titel'}
                              </Text>
                              <Text className="font-normal text-xs text-muted">{formatDate(conv.updatedAt)}</Text>
                            </View>
                            <View className="flex-row gap-2">
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(conv);
                                }}
                                className="p-1"
                              >
                                <Ionicons name="create-outline" size={18} color="#8E8EA0" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(conv.id, conv.title);
                                }}
                                className="p-1"
                              >
                                <Ionicons name="trash-outline" size={18} color="#8E8EA0" />
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                <Text className="font-semibold text-sm text-muted mb-3 uppercase">Kategorieë</Text>
                <View className="gap-2">
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      className="rounded-xl bg-card border border-border px-4 py-3"
                      onPress={() => {
                        // Placeholder for future implementation
                        Alert.alert('Kom binnekort', `${category.name} funksies sal binnekort beskikbaar wees.`);
                      }}
                    >
                      <View className="flex-row items-center gap-3">
                        <Ionicons name={category.icon as any} size={20} color={ACCENT} />
                        <Text className="font-medium text-base text-foreground">{category.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Animated.View>
        <View className="flex-1 bg-black/40" />
      </Pressable>
    </Modal>
  );
}

