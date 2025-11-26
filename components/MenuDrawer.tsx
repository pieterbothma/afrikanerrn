import { useEffect, useState, useRef, useMemo } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useChatStore, Conversation } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";

const ACCENT = "#DE7356"; // Copper
const CHARCOAL = "#1A1A1A";
const MUTED = "#1A1A1A"; // Charcoal for muted text in high contrast

type MenuDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

type DateGroup = {
  label: string;
  conversations: Conversation[];
};

const CATEGORIES = [
  { id: "small-business", name: "Klein Besigheid", icon: "business", color: "#4ADE80" },
  { id: "studies", name: "Studies", icon: "school", color: "#60A5FA" },
  { id: "writing", name: "Skryfwerk", icon: "create", color: "#F472B6" },
  { id: "translation", name: "Vertaling", icon: "language", color: "#FBBF24" },
];

// Navigation item component
function NavItem({ 
  icon, 
  label, 
  onPress,
  badge,
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  onPress: () => void;
  badge?: number;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 py-3 px-3 rounded-xl active:bg-ivory border border-transparent active:border-borderBlack"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="w-9 h-9 rounded-lg bg-yellow border border-borderBlack items-center justify-center">
        <Ionicons name={icon} size={20} color={CHARCOAL} />
      </View>
      <Text className="font-bold text-base text-charcoal flex-1">
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View className="bg-copper px-2 py-0.5 rounded-full border border-borderBlack">
          <Text className="text-white text-xs font-bold">{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={CHARCOAL} />
    </TouchableOpacity>
  );
}

// Conversation item component
function ConversationItem({
  conversation,
  isEditing,
  editTitle,
  onEditTitleChange,
  onSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isActive,
}: {
  conversation: Conversation;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (text: string) => void;
  onSelect: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  isActive?: boolean;
}) {
  if (isEditing) {
    return (
      <View className="flex-row items-center gap-2 py-2">
        <TextInput
          className="flex-1 rounded-lg border-2 border-copper bg-white px-3 py-2 font-medium text-base text-charcoal"
          value={editTitle}
          onChangeText={onEditTitleChange}
          autoFocus
          placeholder="Titel"
          placeholderTextColor="#8E8EA0"
        />
        <TouchableOpacity
          onPress={onSaveEdit}
          className="p-2 bg-copper rounded-lg border border-borderBlack"
        >
          <Ionicons name="checkmark" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancelEdit}
          className="p-2"
        >
          <Ionicons name="close" size={20} color={CHARCOAL} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`flex-row items-center py-3 px-3 rounded-xl border ${isActive ? 'bg-yellow border-borderBlack' : 'bg-transparent border-transparent active:bg-ivory active:border-borderBlack'}`}
      activeOpacity={0.7}
    >
      <View className={`w-2 h-2 rounded-full mr-3 border border-borderBlack ${isActive ? 'bg-charcoal' : 'bg-transparent border-charcoal/50'}`} />
      <View className="flex-1 mr-2">
        <Text
          className={`font-bold text-sm text-charcoal`}
          numberOfLines={1}
        >
          {conversation.title || "Geen titel"}
        </Text>
      </View>
      <View className="flex-row gap-1">
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 rounded-lg active:bg-white/50"
        >
          <Ionicons name="create-outline" size={16} color={CHARCOAL} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg active:bg-white/50"
        >
          <Ionicons name="trash-outline" size={16} color={CHARCOAL} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function MenuDrawer({ visible, onClose }: MenuDrawerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const conversations = useChatStore((state) => state.conversations);
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const loadConversations = useChatStore((state) => state.loadConversations);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const setCurrentConversationId = useChatStore(
    (state) => state.setCurrentConversationId
  );
  const updateConversation = useChatStore((state) => state.updateConversation);
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -320,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  useEffect(() => {
    if (user?.id && visible) {
      loadConversations(user.id);
    }
  }, [user?.id, visible, loadConversations]);

  // Group conversations by date
  const groupedConversations = useMemo((): DateGroup[] => {
    if (conversations.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    const groups: Record<string, Conversation[]> = {
      "Vandag": [],
      "Gister": [],
      "Hierdie week": [],
      "Hierdie maand": [],
      "Ouer": [],
    };

    conversations.forEach((conv) => {
      const date = new Date(conv.updatedAt);
      if (date >= today) {
        groups["Vandag"].push(conv);
      } else if (date >= yesterday) {
        groups["Gister"].push(conv);
      } else if (date >= weekAgo) {
        groups["Hierdie week"].push(conv);
      } else if (date >= monthAgo) {
        groups["Hierdie maand"].push(conv);
      } else {
        groups["Ouer"].push(conv);
      }
    });

    return Object.entries(groups)
      .filter(([_, convs]) => convs.length > 0)
      .map(([label, convs]) => ({ label, conversations: convs }));
  }, [conversations]);

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    onClose();
    router.push("/(tabs)");
  };

  const handleDeleteConversation = (
    conversationId: string,
    title: string | null
  ) => {
    Alert.alert(
      "Skrap gesprek",
      `Is jy seker jy wil "${title || "Hierdie gesprek"}" skrap?`,
      [
        { text: "Kanselleer", style: "cancel" },
        {
          text: "Skrap",
          style: "destructive",
          onPress: async () => {
            await deleteConversation(conversationId);
            if (user?.id) {
              await loadConversations(user.id);
            }
          },
        },
      ]
    );
  };

  const handleStartEdit = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title || "");
  };

  const handleSaveEdit = async () => {
    if (editingId && editTitle.trim()) {
      await updateConversation(editingId, editTitle.trim());
      if (user?.id) {
        await loadConversations(user.id);
      }
      setEditingId(null);
      setEditTitle("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 flex-row" onPress={onClose}>
        {/* Backdrop */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: backdropAnim,
          }}
        />

        {/* Drawer */}
        <Animated.View
          style={{
            transform: [{ translateX: slideAnim }],
            width: 300,
            height: "100%",
          }}
          className="bg-sand border-r-3 border-borderBlack"
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="flex-1">
            {/* Header */}
            <View
              className="px-5 pt-4 pb-5 border-b-3 border-borderBlack bg-sand"
              style={{ paddingTop: Math.max(insets.top, 16) }}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-heading font-black text-2xl text-charcoal">
                    Koedoe
                  </Text>
                  <Text className="text-sm text-charcoal mt-0.5 font-medium">
                    {user?.displayName || user?.email || 'Welkom'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose} 
                  className="w-10 h-10 rounded-full bg-ivory border-2 border-borderBlack items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={22} color={CHARCOAL} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="px-4 py-4">
                {/* Navigation */}
                <View className="mb-6">
                  <NavItem
                    icon="settings-outline"
                    label="Instellings"
                    onPress={() => {
                      onClose();
                      router.push("/settings" as any);
                    }}
                  />
                </View>

                {/* Conversations Section */}
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="font-bold text-xs text-charcoal uppercase tracking-wider">
                      Gesprekke
                    </Text>
                    <Text className="text-xs text-charcoal font-medium">
                      {conversations.length}
                    </Text>
                  </View>

                  {conversations.length === 0 ? (
                    <View className="py-8 items-center">
                      <View className="w-12 h-12 rounded-full bg-ivory border-2 border-borderBlack items-center justify-center mb-3">
                        <Ionicons name="chatbubbles-outline" size={24} color={CHARCOAL} />
                      </View>
                      <Text className="font-medium text-sm text-charcoal text-center">
                        Geen gesprekke nog nie.{'\n'}Begin deur iets te vra!
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-4">
                      {groupedConversations.map((group) => (
                        <View key={group.label}>
                          <Text className="text-xs text-charcoal/60 font-bold mb-2 px-3">
                            {group.label}
                          </Text>
                          <View className="gap-1">
                            {group.conversations.map((conv) => (
                              <ConversationItem
                                key={conv.id}
                                conversation={conv}
                                isEditing={editingId === conv.id}
                                editTitle={editTitle}
                                onEditTitleChange={setEditTitle}
                                onSelect={() => handleSelectConversation(conv.id)}
                                onEdit={() => handleStartEdit(conv)}
                                onSaveEdit={handleSaveEdit}
                                onCancelEdit={handleCancelEdit}
                                onDelete={() => handleDeleteConversation(conv.id, conv.title)}
                                isActive={currentConversationId === conv.id}
                              />
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Categories Section */}
                <View>
                  <Text className="font-bold text-xs text-charcoal uppercase tracking-wider mb-3 px-1">
                    Snelroetes
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        className="rounded-xl bg-ivory border-2 border-borderBlack px-3 py-2 flex-row items-center gap-2 shadow-brutal-sm"
                        onPress={() => {
                          Alert.alert(
                            "Kom binnekort",
                            `${category.name} funksies sal binnekort beskikbaar wees.`
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={category.icon as any}
                          size={16}
                          color={CHARCOAL}
                        />
                        <Text className="font-bold text-sm text-charcoal">
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="px-5 py-4 border-t-3 border-borderBlack bg-sand">
              <Text className="text-xs text-charcoal font-medium text-center">
                Koedoe AI • Slim. Sterk. Afrikaans.
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
