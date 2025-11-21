import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  Image,
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
import * as DocumentPicker from 'expo-document-picker';
import { streamAfrikaansMessage, OpenAIChatMessage, identifyImageSubject, answerQuestionAboutDocument } from '@/lib/openai';
import { uploadImageToSupabase, uploadDocumentToSupabase } from '@/lib/storage';
import { checkUsageLimit, logUsage, getTodayUsage, USAGE_LIMITS, getUserTier } from '@/lib/usageLimits';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { generateUUID } from '@/lib/utils';
import { track } from '@/lib/analytics';

const ACCENT = '#B46E3A';
const LOGO = require('../../assets/branding/koedoelogo.png');
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

export default function ChatScreen() {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateImageModal, setShowCreateImageModal] = useState(false);
  const [showEditImageModal, setShowEditImageModal] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | undefined>();
  const [isIdentifyProcessing, setIsIdentifyProcessing] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; previewUri: string } | null>(null);
  const [pendingDocument, setPendingDocument] = useState<{
    uri: string;
    localUri: string;
    name: string;
    mimeType?: string;
    size?: number;
  } | null>(null);
  const isStartingNewChat = useRef(false);

  const user = useUserStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight ? useBottomTabBarHeight() : 0;
  const keyboardOffset = Platform.OS === 'ios' ? tabBarHeight : 0;

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
    if (!trimmed && !pendingImage && !pendingDocument) {
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

    // Store pending image and document before clearing
    const imageToSend = pendingImage;
    const documentToSend = pendingDocument;
    setPendingImage(null);
    setPendingDocument(null);

    const userMessage: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content: trimmed || '',
      imageUri: imageToSend?.uri,
      previewUri: imageToSend?.previewUri,
      documentUrl: documentToSend?.uri,
      documentName: documentToSend?.name,
      documentMimeType: documentToSend?.mimeType,
      documentSize: documentToSend?.size,
      createdAt: new Date().toISOString(),
      conversationId: conversationId ?? undefined,
    };

    addMessage(userMessage);
    setInput('');

    // Auto-name conversation with first user message (trimmed to 60 chars)
    if (isNewConversation && conversationId) {
      const fallbackTitle = imageToSend
        ? 'Foto gelaai'
        : documentToSend
          ? 'Dokument gelaai'
          : 'Nuwe gesprek';
      const title =
        trimmed.length > 0
          ? trimmed.length > 60
            ? trimmed.substring(0, 60) + '...'
            : trimmed
          : fallbackTitle;
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
      // If image is present, use Vision API
      if (imageToSend) {
        const question = trimmed 
          ? `Die gebruiker vra: "${trimmed}". Beantwoord hierdie vraag oor die foto.`
          : 'Beskryf wat jy in hierdie foto sien.';
        const description = await identifyImageSubject(imageToSend.previewUri || imageToSend.uri, {
          scenario: 'general',
          extraInstructions: question,
        });

        updateMessage(assistantMessageId, { content: description });
        await saveMessageToSupabase({ ...assistantMessage, content: description }, user.id);
      } else if (documentToSend) {
        // If document is present, use document analysis API
        const question = trimmed || 'Gee my \'n opsomming van hierdie dokument.';
        const answer = await answerQuestionAboutDocument(
          documentToSend.localUri || documentToSend.uri,
          documentToSend.name,
          documentToSend.mimeType,
          question,
        );

        updateMessage(assistantMessageId, { content: answer });
        await saveMessageToSupabase({ ...assistantMessage, content: answer }, user.id);
      } else {
        // Regular text chat
        const currentMessages = useChatStore.getState().messages;
        const history: OpenAIChatMessage[] = currentMessages
          .filter((msg) => msg.id !== assistantMessageId)
          .map((msg) => ({
            role: msg.role,
            content:
              msg.content && msg.content.length > 0
                ? msg.content
                : msg.imageUri
                  ? '(Beeld gestuur)'
                  : msg.documentUrl
                    ? '(Dokument gestuur)'
                    : '',
          }));

        let fullContent = '';
        for await (const chunk of streamAfrikaansMessage(history, user.tonePreset || 'informeel')) {
          fullContent += chunk;
          updateMessage(assistantMessageId, { content: fullContent });
        }

        await saveMessageToSupabase({ ...assistantMessage, content: fullContent }, user.id);
      }
    } catch (error) {
      console.error('Kon nie boodskap stuur nie:', error);
      Alert.alert('Oeps!', 'Koedoe kon nie reageer nie. Probeer asseblief weer.');
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
    setPendingImage(null);
    setPendingDocument(null);
    
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
    console.log('[ChatScreen] handleTakePhoto called');
    if (!user?.id) {
      Alert.alert('Meld aan', "Jy moet aangemeld wees om 'n foto te maak.");
      return;
    }

    track('camera_capture_requested');
    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;
    if (!conversationId) {
      conversationId = await createConversation(user.id);
      if (conversationId) {
        setCurrentConversationId(conversationId);
      }
    }

    try {
      console.log('[ChatScreen] Requesting camera permission...');
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        console.log('[ChatScreen] Camera permission denied');
        return;
      }

      console.log('[ChatScreen] Opening camera...');
      
      // Small delay to ensure app is ready after modal closes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('[ChatScreen] Calling launchCameraAsync...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: IMAGE_MEDIA_TYPES,
        quality: 0.7,
        allowsEditing: true,
      });
      
      console.log('[ChatScreen] Camera result received:', result.canceled ? 'canceled' : 'success');

      console.log('[ChatScreen] Camera result:', { 
        canceled: result.canceled, 
        assetsCount: result.assets?.length || 0 
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[ChatScreen] Camera was canceled or no assets');
        return;
      }

      const asset = result.assets[0];
      const previewUri = asset.uri;

      const uploadedUrl = await uploadImageToSupabase(asset.uri, user.id, generateUUID());
      const finalImageUri = uploadedUrl || previewUri;

      // Store image in pending state instead of adding as message
      setPendingImage({
        uri: finalImageUri,
        previewUri: previewUri,
      });

      track('camera_capture_completed');
    } catch (error: any) {
      console.error('[ChatScreen] Error taking photo:', error);
      console.error('[ChatScreen] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      track('camera_capture_failed');
      Alert.alert('Oeps!', `Kon nie die foto maak nie: ${error?.message || 'Onbekende fout'}. Probeer asseblief weer.`);
    }
  };

  const handleEditPhoto = async () => {
    if (!user?.id) {
      Alert.alert('Meld aan', "Jy moet aangemeld wees om 'n foto te redigeer.");
      return;
    }

    track('image_edit_picker_requested');
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
        mediaTypes: IMAGE_MEDIA_TYPES,
        quality: 0.7,
        allowsMultipleSelection: false,
        allowsEditing: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const previewUri = asset.uri;
      setSelectedImageForEdit(asset.uri);
      setShowEditImageModal(true);
      track('image_edit_picker_completed');

      // Auto-name conversation with photo edit
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'Foto geredigeer');
      }
    } catch (error) {
      console.error('Kon nie foto kies nie:', error);
      Alert.alert('Oeps!', "Kon nie die foto laai nie. Probeer asseblief weer.");
    }
  };

  const handleAddFiles = async () => {
    console.log('[ChatScreen] handleAddFiles called');
    if (!user?.id) {
      Alert.alert('Meld aan', "Jy moet aangemeld wees om 'n dokument op te laai.");
      return;
    }

    track('document_upload_requested');

    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;
    if (!conversationId) {
      conversationId = await createConversation(user.id);
      if (conversationId) {
        setCurrentConversationId(conversationId);
      }
    }

    try {
      console.log('[ChatScreen] Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/json', 'text/csv', 'text/markdown'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      console.log('[ChatScreen] Document picker result:', { canceled: result.canceled, assetsCount: result.assets?.length });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[ChatScreen] Document picker was canceled or no assets');
        return;
      }

      const asset = result.assets[0];
      console.log('[ChatScreen] Document selected, uploading to Supabase...', { name: asset.name, size: asset.size, mimeType: asset.mimeType });

      const uploadedUrl = await uploadDocumentToSupabase(
        asset.uri,
        user.id,
        generateUUID(),
        asset.name,
        asset.mimeType || 'application/octet-stream'
      );
      if (!uploadedUrl) {
        Alert.alert('Oeps!', 'Kon nie die dokument oplaai nie. Probeer asseblief weer.');
        track('document_upload_failed', { reason: 'upload_failed' });
        return;
      }
      const finalDocumentUri = uploadedUrl;
      console.log('[ChatScreen] Document uploaded, setting pending document');

      // Store document in pending state instead of adding as message
      setPendingDocument({
        uri: finalDocumentUri,
        localUri: asset.uri,
        name: asset.name ?? 'dokument',
        mimeType: asset.mimeType,
        size: asset.size,
      });

      // Auto-name conversation with document if new
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'Dokument gelaai');
      }

      flatListRef.current?.scrollToEnd({ animated: true });
      track('document_upload_completed');
    } catch (error: any) {
      console.error('[ChatScreen] Kon nie dokument laai nie:', error);
      Alert.alert('Oeps!', 'Kon nie die dokument laai nie. Probeer asseblief weer.');
      track('document_upload_failed', { error: error?.message || 'Unknown error' });
    }
  };

  const handleCreateImage = async () => {
    if (!user?.id) {
      return;
    }

    track('image_generation_modal_open_requested');
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
    track('image_generation_modal_opened');
  };

  const handleIdentifyPhoto = async () => {
    console.log('[ChatScreen] handleIdentifyPhoto called');
    if (!user?.id) {
      Alert.alert('Meld aan', "Jy moet aangemeld wees om 'n foto te laai.");
      return;
    }

    track('identify_photo_requested');

    let conversationId = currentConversationId;
    const isNewConversation = !conversationId;

    try {
      console.log('[ChatScreen] Requesting media library permission...');
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        console.log('[ChatScreen] Media library permission denied');
        return;
      }

      console.log('[ChatScreen] Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: IMAGE_MEDIA_TYPES,
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      console.log('[ChatScreen] Image library result:', { canceled: result.canceled, assetsCount: result.assets?.length });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[ChatScreen] Image library was canceled or no assets');
        return;
      }

      const asset = result.assets[0];
      const previewUri = asset.uri;
      console.log('[ChatScreen] Image selected, uploading to Supabase...');

      const uploadedUrl = await uploadImageToSupabase(asset.uri, user.id, generateUUID());
      const finalImageUri = uploadedUrl || previewUri;
      console.log('[ChatScreen] Image uploaded, setting pending image');

      // Store image in pending state instead of adding as message
      setPendingImage({
        uri: finalImageUri,
        previewUri: previewUri,
      });

      // Auto-name conversation with photo if new
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'Foto gelaai');
      }

      flatListRef.current?.scrollToEnd({ animated: true });
      track('identify_photo_completed');
    } catch (error: any) {
      console.error('[ChatScreen] Kon nie foto laai nie:', error);
      Alert.alert('Oeps!', 'Kon nie die foto laai nie. Probeer asseblief weer.');
      track('identify_photo_failed', { error: error?.message || 'Unknown error' });
    }
  };

  const handleImageGenerated = async (imageUri: string, previewUri: string) => {
    if (!user?.id) {
      return;
    }

    try {
      // Log usage after successful image generation
      await logUsage(user.id, 'image_generate');
      track('image_generation_completed');

      let conversationId = currentConversationId;
      const isNewConversation = !conversationId;
      if (!conversationId) {
        conversationId = await createConversation(user.id);
        if (conversationId) {
          setCurrentConversationId(conversationId);
        }
      }

      // Store image in pending state instead of adding as message
      setPendingImage({
        uri: imageUri,
        previewUri: previewUri,
      });

      // Auto-name conversation with AI image if new
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'AI-beeld geskep');
      }

      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Kon nie beeld generasie verwerk nie:', error);
      track('image_generation_failed');
      Alert.alert('Oeps!', 'Kon nie beeld generasie verwerk nie. Probeer asseblief weer.');
    }
  };

  const handleImageEdited = async (imageUri: string, previewUri: string) => {
    if (!user?.id) {
      return;
    }

    try {
      // Log usage after successful image edit
      await logUsage(user.id, 'image_edit');
      track('image_edit_completed');

      let conversationId = currentConversationId;
      const isNewConversation = !conversationId;
      if (!conversationId) {
        conversationId = await createConversation(user.id);
        if (conversationId) {
          setCurrentConversationId(conversationId);
        }
      }

      // Store image in pending state instead of adding as message
      setPendingImage({
        uri: imageUri,
        previewUri: previewUri,
      });

      // Auto-name conversation with edited image if new
      if (isNewConversation && conversationId) {
        await updateConversation(conversationId, 'Beeld gewysig');
      }

      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Kon nie beeld wysiging verwerk nie:', error);
      track('image_edit_failed');
      Alert.alert('Oeps!', 'Kon nie beeld wysiging verwerk nie. Probeer asseblief weer.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#1A1A1A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
    >
      <View className="flex-1 bg-background">
        {/* Header Bar */}
        <View
          className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-background"
          style={{ paddingTop: Math.max(insets.top, 16) }}
        >
          <TouchableOpacity onPress={() => setShowMenuDrawer(true)} className="p-2">
            <Ionicons name="menu" size={24} color="#E8E2D6" />
          </TouchableOpacity>
          
          {/* Logo - Centered */}
          <View className="flex-1 items-center justify-center px-4">
            <Image
              source={LOGO}
              style={{ height: 56, width: 200, resizeMode: 'contain' }}
            />
          </View>
          
          <TouchableOpacity onPress={handleNewChat} className="p-2">
            <Ionicons name="create-outline" size={24} color="#E8E2D6" />
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

        {isSending && (
          <View className="flex-row items-center justify-center py-2">
            <ActivityIndicator color={ACCENT} size="small" />
            <Text className="ml-2 text-sm text-muted">Koedoe dink…</Text>
          </View>
        )}

        <InputBar
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          onTakePhoto={handleTakePhoto}
          onEditPhoto={handleEditPhoto}
          onAddFiles={handleAddFiles}
          onCreateImage={handleCreateImage}
          onIdentifyPhoto={handleIdentifyPhoto}
          isSending={isSending}
          pendingImage={pendingImage}
          onClearPendingImage={() => setPendingImage(null)}
          pendingDocument={pendingDocument}
          onClearPendingDocument={() => setPendingDocument(null)}
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

