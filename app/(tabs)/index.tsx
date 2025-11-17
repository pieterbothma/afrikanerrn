import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestCameraPermission, requestMediaLibraryPermission } from '@/lib/permissions';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ChatBubble from '@/components/ChatBubble';
import InputBar from '@/components/InputBar';
import BrutalistCard from '@/components/BrutalistCard';
import MenuDrawer from '@/components/MenuDrawer';
import ImageGenerationModal from '@/components/ImageGenerationModal';
import ImageEditModal from '@/components/ImageEditModal';
import { streamAfrikaansMessage, OpenAIChatMessage } from '@/lib/openai';
import { uploadImageToSupabase } from '@/lib/storage';
import { checkUsageLimit, logUsage, getTodayUsage, USAGE_LIMITS, getUserTier } from '@/lib/usageLimits';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';

const ACCENT = '#DE7356';

const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

export default function ChatScreen() {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateImageModal, setShowCreateImageModal] = useState(false);
  const [showEditImageModal, setShowEditImageModal] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | undefined>();
  const isStartingNewChat = useRef(false);

  const user = useUserStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight ? useBottomTabBarHeight() : 0;
  const keyboardOffset = Platform.OS === 'ios' ? tabBarHeight + insets.bottom + 12 : 0;

  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const loadMessagesFromSupabase = useChatStore((state) => state.loadMessagesFromSupabase);
  const saveMessageToSupabase = useChatStore((state) => state.saveMessageToSupabase);
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const setCurrentConversationId = useChatStore((state) => state.setCurrentConversationId);
  const createConversation = useChatStore((state) => state.createConversation);
  const updateConversation = useChatStore((state) => state.updateConversation);
  const clearMessages = useChatStore((state) => state.clearMessages);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Skip loading if we're intentionally starting a new chat
    if (isStartingNewChat.current) {
      isStartingNewChat.current = false;
      return;
    }

    // Skip loading if we're currently sending a message (to prevent clearing messages)
    if (isSending) {
      return;
    }

    // Only load when an existing conversation is selected.
    if (!currentConversationId) {
      return;
    }

    loadMessagesFromSupabase(user.id, currentConversationId);
  }, [loadMessagesFromSupabase, user?.id, currentConversationId, isSending]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  // Helper function to show warning when nearing limits
  const checkAndWarnUsage = async (type: 'chat' | 'image_generate' | 'image_edit') => {
    if (!user?.id) return;
    
    const usageCheck = await checkUsageLimit(user.id, type);
    const percentage = (usageCheck.current / usageCheck.limit) * 100;
    
    // Show warning when 80% or more used (but not exceeded)
    if (percentage >= 80 && usageCheck.allowed) {
      const labels = {
        chat: 'boodskappe',
        image_generate: 'beeld generasies',
        image_edit: 'beeld wysigings',
      };
      
      Alert.alert(
        'Limiet waarskuwing',
        `Jy het ${usageCheck.remaining} ${labels[type]} oor vir vandag. Oorweeg om op te gradeer na premium vir hoër limiete.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSend = async (promptOverride?: string) => {
    if (!user?.id || isSending) {
      return;
    }

    const trimmed = (promptOverride || input).trim();
    if (!trimmed) {
      return;
    }

    // Check usage limit before sending
    const usageCheck = await checkUsageLimit(user.id, 'chat');
    if (!usageCheck.allowed) {
      Alert.alert(
        'Daglimiet bereik',
        `Jy het jou daglimiet van ${usageCheck.limit} boodskappe bereik. Probeer môre weer of oorweeg om op te gradeer na premium.`,
      );
      return;
    }
    
    // Warn if nearing limit (but still allow)
    await checkAndWarnUsage('chat');

    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;
    
    // Set sending flag early to prevent useEffect from reloading
    setIsSending(true);
    
    if (!conversationId) {
      conversationId = await createConversation(user.id);
      if (conversationId) {
        setCurrentConversationId(conversationId);
      }
    }

    const userMessage: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      conversationId: conversationId ?? undefined,
    };

    addMessage(userMessage);
    setInput('');

    // Auto-name conversation with first user message (trimmed to 60 chars)
    if (isNewConversation && conversationId) {
      const title = trimmed.length > 60 ? trimmed.substring(0, 60) + '...' : trimmed;
      await updateConversation(conversationId, title);
    }

    await saveMessageToSupabase(userMessage, user.id);
    
    // Log usage after successful message save
    await logUsage(user.id, 'chat');

    const assistantMessageId = generateUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      conversationId: conversationId ?? undefined,
    };

    addMessage(assistantMessage);

    try {
      const currentMessages = useChatStore.getState().messages;
      const history: OpenAIChatMessage[] = currentMessages
        .filter((msg) => msg.id !== assistantMessageId)
        .map((msg) => ({
          role: msg.role,
          content: msg.content && msg.content.length > 0 ? msg.content : msg.imageUri ? '(Beeld gestuur)' : '',
        }));

      let fullContent = '';
      for await (const chunk of streamAfrikaansMessage(history, user.tonePreset || 'informeel')) {
        fullContent += chunk;
        updateMessage(assistantMessageId, { content: fullContent });
      }

      await saveMessageToSupabase({ ...assistantMessage, content: fullContent }, user.id);
    } catch (error) {
      console.error('Kon nie boodskap stuur nie:', error);
      Alert.alert('Oeps!', 'Afrikaner.ai kon nie reageer nie. Probeer asseblief weer.');
      updateMessage(assistantMessageId, {
        content: 'Oeps! Ek kon nie reageer nie. Probeer asseblief weer.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = async () => {
    if (!user?.id) {
      return;
    }

    setIsRefreshing(true);
    await loadMessagesFromSupabase(user.id, currentConversationId ?? undefined);
    setIsRefreshing(false);
  };

  const handleNewChat = () => {
    if (!user?.id) {
      return;
    }

    // Set flag to prevent useEffect from reloading messages
    isStartingNewChat.current = true;
    
    // Clear current conversation ID
    setCurrentConversationId(null);
    
    // Clear all messages from the store
    clearMessages();
    
    // Clear input field
    setInput('');
    
    // Scroll to top immediately
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    
    // Note: A new conversation will be created automatically when the user sends their first message
    // This ensures we start with a completely fresh, empty chat
  };

  const handlePromptClick = async (prompt: string) => {
    if (!user?.id || isSending) {
      return;
    }

    // Call handleSend directly with the prompt
    await handleSend(prompt);
  };

  const handleTakePhoto = async () => {
    if (!user?.id) {
      Alert.alert('Meld aan', "Jy moet aangemeld wees om 'n foto te maak.");
      return;
    }

    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;
    if (!conversationId) {
      conversationId = await createConversation(user.id);
      if (conversationId) {
        setCurrentConversationId(conversationId);
      }
    }

    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const messageId = generateUUID();

      const uploadedUrl = await uploadImageToSupabase(asset.uri, user.id, messageId);
      const imageMessage: ChatMessage = {
        id: messageId,
        role: 'user',
        content: '(Foto gemaak)',
        imageUri: uploadedUrl || asset.uri,
        createdAt: new Date().toISOString(),
        conversationId: conversationId ?? undefined,
      };

      addMessage(imageMessage);
      await saveMessageToSupabase(imageMessage, user.id);
      
      // Log usage (photo taking doesn't count as image_generate, but we could add a separate type if needed)
      // For now, we'll just log the message as chat usage

      // Auto-name conversation with photo
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'Foto gemaak');
      }

      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Kon nie foto maak nie:', error);
      Alert.alert('Oeps!', "Kon nie die foto maak nie. Probeer asseblief weer.");
    }
  };

  const handleEditPhoto = async () => {
    if (!user?.id) {
      Alert.alert('Meld aan', "Jy moet aangemeld wees om 'n foto te redigeer.");
      return;
    }

    // Check usage limit before opening image picker
    const usageCheck = await checkUsageLimit(user.id, 'image_edit');
    if (!usageCheck.allowed) {
      Alert.alert(
        'Daglimiet bereik',
        `Jy het jou daglimiet van ${usageCheck.limit} beeld wysigings bereik. Probeer môre weer of oorweeg om op te gradeer na premium.`,
      );
      return;
    }
    
    // Warn if nearing limit (but still allow)
    await checkAndWarnUsage('image_edit');

    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;
    if (!conversationId) {
      conversationId = await createConversation(user.id);
      if (conversationId) {
        setCurrentConversationId(conversationId);
      }
    }

    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: false,
        allowsEditing: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setSelectedImageForEdit(asset.uri);
      setShowEditImageModal(true);

      // Auto-name conversation with photo edit
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'Foto geredigeer');
      }
    } catch (error) {
      console.error('Kon nie foto kies nie:', error);
      Alert.alert('Oeps!', "Kon nie die foto laai nie. Probeer asseblief weer.");
    }
  };

  const handleAddFiles = () => {
    // Placeholder for future file upload and analysis feature
    Alert.alert('Kom binnekort', 'Lêer oplaai en analise funksies sal binnekort beskikbaar wees.');
  };

  const handleCreateImage = async () => {
    if (!user?.id) {
      return;
    }

    // Check usage limit before opening modal
    const usageCheck = await checkUsageLimit(user.id, 'image_generate');
    if (!usageCheck.allowed) {
      Alert.alert(
        'Daglimiet bereik',
        `Jy het jou daglimiet van ${usageCheck.limit} beeld generasies bereik. Probeer môre weer of oorweeg om op te gradeer na premium.`,
      );
      return;
    }
    
    // Warn if nearing limit (but still allow)
    await checkAndWarnUsage('image_generate');

    setShowCreateImageModal(true);
  };

  const handleEditImage = async () => {
    if (!user?.id) {
      return;
    }

    // Check usage limit before opening edit modal
    const usageCheck = await checkUsageLimit(user.id, 'image_edit');
    if (!usageCheck.allowed) {
      Alert.alert(
        'Daglimiet bereik',
        `Jy het jou daglimiet van ${usageCheck.limit} beeld wysigings bereik. Probeer môre weer of oorweeg om op te gradeer na premium.`,
      );
      return;
    }
    
    // Warn if nearing limit (but still allow)
    await checkAndWarnUsage('image_edit');

    const lastImageMessage = [...messages].reverse().find((msg) => msg.imageUri);
    if (lastImageMessage?.imageUri) {
      setSelectedImageForEdit(lastImageMessage.imageUri);
      setShowEditImageModal(true);
    } else {
      Alert.alert('Geen beeld', "Kies eers 'n beeld om te wysig.");
    }
  };

  const handleImageGenerated = async (imageUrl: string) => {
    if (!user?.id) {
      return;
    }

    try {
      // Log usage after successful image generation
      await logUsage(user.id, 'image_generate');

      let conversationId = currentConversationId;
      const isNewConversation = !conversationId;
      if (!conversationId) {
        conversationId = await createConversation(user.id);
        if (conversationId) {
          setCurrentConversationId(conversationId);
        }
      }

      const messageId = generateUUID();
      const imageMessage: ChatMessage = {
        id: messageId,
        role: 'user',
        content: '(AI-beeld geskep)',
        imageUri: imageUrl,
        createdAt: new Date().toISOString(),
        conversationId: conversationId ?? undefined,
      };

      addMessage(imageMessage);
      await saveMessageToSupabase(imageMessage, user.id);

      // Auto-name conversation with AI image
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'AI-beeld geskep');
      }

      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Kon nie beeld generasie verwerk nie:', error);
      // Don't show alert here - error was already shown in modal
    }
  };

  const handleImageEdited = async (imageUrl: string) => {
    if (!user?.id) {
      return;
    }

    try {
      // Log usage after successful image edit
      await logUsage(user.id, 'image_edit');

      let conversationId = currentConversationId;
      const isNewConversation = !conversationId;
      if (!conversationId) {
        conversationId = await createConversation(user.id);
        if (conversationId) {
          setCurrentConversationId(conversationId);
        }
      }

      const messageId = generateUUID();
      const imageMessage: ChatMessage = {
        id: messageId,
        role: 'user',
        content: '(Beeld gewysig)',
        imageUri: imageUrl,
        createdAt: new Date().toISOString(),
        conversationId: conversationId ?? undefined,
      };

      addMessage(imageMessage);
      await saveMessageToSupabase(imageMessage, user.id);

      // Auto-name conversation with edited image
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'Beeld gewysig');
      }

      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Kon nie beeld wysiging verwerk nie:', error);
      // Don't show alert here - error was already shown in modal
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      <View className="flex-1 bg-background">
        {/* Header Bar */}
        <View
          className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-background"
          style={{ paddingTop: Math.max(insets.top, 16) }}
        >
          <TouchableOpacity onPress={() => setShowMenuDrawer(true)} className="p-2">
            <Ionicons name="menu" size={24} color="#2C2C2C" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNewChat} className="p-2">
            <Ionicons name="create-outline" size={24} color="#2C2C2C" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => `${item.id}-${item.createdAt}-${index}`}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 16,
          }}
          style={{ flex: 1 }}
          contentInset={{ bottom: tabBarHeight + insets.bottom + 72 }}
          scrollIndicatorInsets={{ bottom: tabBarHeight + insets.bottom + 72 }}
          renderItem={({ item }) => <ChatBubble message={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={
            <View className="pt-12">
              <View className="px-4">
                <BrutalistCard
                  title="Praat, ek luister."
                  description="Vra oor Huiswerk, Besigheid, die Buitenste Ruim, of enigeiets waarmee jy hulp nodig het."
                />
                <View className="px-5 mt-4">
                  <Text className="font-normal text-sm text-muted text-center">
                    Begin sommer hier en gebruik die "+" vir prentjies en kreatiewe krag.
                  </Text>
                </View>
                
                {/* Prompt Suggestions */}
                <View className="mt-6 gap-3">
                  <TouchableOpacity
                    onPress={() => handlePromptClick("Hoe begin ek 'n klein besigheid?")}
                    disabled={isSending}
                    activeOpacity={0.7}
                    className="rounded-xl bg-card border border-border p-4"
                  >
                    <Text className="font-medium text-sm text-foreground">
                      Hoe begin ek 'n klein besigheid?
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handlePromptClick("Verduidelik fotosintese eenvoudig.")}
                    disabled={isSending}
                    activeOpacity={0.7}
                    className="rounded-xl bg-card border border-border p-4"
                  >
                    <Text className="font-medium text-sm text-foreground">
                      Verduidelik fotosintese eenvoudig.
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handlePromptClick("Vertel my meer oor Jesus se wonderwerke?")}
                    disabled={isSending}
                    activeOpacity={0.7}
                    className="rounded-xl bg-card border border-border p-4"
                  >
                    <Text className="font-medium text-sm text-foreground">
                      Vertel my meer oor Jesus se wonderwerke?
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          }
          refreshControl={<RefreshControl tintColor={ACCENT} refreshing={isRefreshing} onRefresh={handleRefresh} />}
        />

        <InputBar
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          onTakePhoto={handleTakePhoto}
          onEditPhoto={handleEditPhoto}
          onAddFiles={handleAddFiles}
          onCreateImage={handleCreateImage}
          isSending={isSending}
        />

        <MenuDrawer visible={showMenuDrawer} onClose={() => setShowMenuDrawer(false)} />

        {user?.id && (
          <>
            <ImageGenerationModal
              visible={showCreateImageModal}
              onClose={() => setShowCreateImageModal(false)}
              onImageGenerated={handleImageGenerated}
              userId={user.id}
              messageId={generateUUID()}
            />
            <ImageEditModal
              visible={showEditImageModal}
              onClose={() => {
                setShowEditImageModal(false);
                setSelectedImageForEdit(undefined);
              }}
              onImageEdited={handleImageEdited}
              userId={user.id}
              messageId={generateUUID()}
              existingImageUri={selectedImageForEdit}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

