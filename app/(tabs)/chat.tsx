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
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestCameraPermission, requestMediaLibraryPermission } from '@/lib/permissions';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ChatBubble from '@/components/ChatBubble';
import InputBar from '@/components/InputBar';
import MenuDrawer from '@/components/MenuDrawer';
import ImageGenerationModal from '@/components/ImageGenerationModal';
import ImageEditModal from '@/components/ImageEditModal';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { streamAfrikaansMessage, OpenAIChatMessage, identifyImageSubject, answerQuestionAboutDocument } from '@/lib/openai';
import { uploadImageToSupabase, uploadDocumentToSupabase } from '@/lib/storage';
import { checkUsageLimit, logUsage, getTodayUsage, USAGE_LIMITS, getUserTier } from '@/lib/usageLimits';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { generateUUID } from '@/lib/utils';
import { track } from '@/lib/analytics';

const ACCENT = '#DE7356'; // Copper
const CHARCOAL = '#1A1A1A';
const SAND = '#E8E2D6';
const LOGO = require('../../assets/branding/koedoelogo.png');
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

// Animated prompt suggestion component
type PromptSuggestionProps = {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled: boolean;
  delay: number;
};

function PromptSuggestion({ text, icon, onPress, disabled, delay }: PromptSuggestionProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, [animValue, delay]);

  return (
    <Animated.View
      style={{
        opacity: animValue,
        transform: [{
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        className="rounded-xl bg-ivory border-2 border-borderBlack p-4 flex-row items-center gap-3 shadow-brutal-sm"
      >
        <View className="w-9 h-9 rounded-lg bg-yellow border border-borderBlack items-center justify-center">
          <Ionicons name={icon} size={18} color={CHARCOAL} />
        </View>
        <Text className="font-bold text-sm text-charcoal flex-1">
          {text}
        </Text>
        <Ionicons name="arrow-forward-circle" size={24} color={ACCENT} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Welcome state component with animations
type WelcomeStateProps = {
  onPromptClick: (prompt: string) => void;
  isSending: boolean;
};

function WelcomeState({ onPromptClick, isSending }: WelcomeStateProps) {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  const prompts = [
    { text: "Hoe begin ek 'n klein besigheid?", icon: 'business' as const },
    { text: "Verduidelik fotosintese eenvoudig.", icon: 'leaf' as const },
    { text: "Vertel my meer oor Jesus se wonderwerke?", icon: 'book' as const },
    { text: "Skryf 'n kort gedig oor die natuur.", icon: 'sparkles' as const },
  ];

  return (
    <View className="pt-6">
      {/* Hero Card */}
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [{
            translateY: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          }],
        }}
        className="px-4"
      >
        <View
          className="rounded-2xl p-6 border-3 border-borderBlack bg-yellow shadow-brutal"
        >
          <Text className="font-heading font-black text-3xl text-charcoal text-center">
            Praat, ek luister.
          </Text>
          <Text className="mt-3 font-medium text-lg text-charcoal text-center leading-6">
            Vra oor Huiswerk, Besigheid, die Buitenste Ruim, of enigiets waarmee jy hulp nodig het.
          </Text>
          
          <View className="mt-6 flex-row items-center justify-center gap-3">
            <View className="h-0.5 flex-1 bg-charcoal/20" />
            <Text className="text-xs text-charcoal font-bold uppercase tracking-wider">of probeer</Text>
            <View className="h-0.5 flex-1 bg-charcoal/20" />
          </View>
        </View>
      </Animated.View>

      {/* Prompt Suggestions with staggered animation */}
      <View className="mt-6 px-4 gap-3">
        {prompts.map((prompt, index) => (
          <PromptSuggestion
            key={prompt.text}
            text={prompt.text}
            icon={prompt.icon}
            onPress={() => onPromptClick(prompt.text)}
            disabled={isSending}
            delay={400 + index * 100}
          />
        ))}
      </View>

      {/* Helper text */}
      <View className="px-8 mt-8 mb-4">
        <Text className="font-medium text-sm text-charcoal/60 text-center">
          Gebruik die{' '}
          <Text className="font-bold text-copper">+</Text>
          {' '}knoppie vir prentjies, dokumente en kreatiewe krag.
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen({ showHeader = true }: { showHeader?: boolean }) {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateImageModal, setShowCreateImageModal] = useState(false);
  const [showEditImageModal, setShowEditImageModal] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | undefined>();
  const [isIdentifyProcessing, setIsIdentifyProcessing] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    previewUri: string;
    uploadState?: 'uploading' | 'done' | 'failed';
    uploadError?: string;
  } | null>(null);
  const [pendingDocument, setPendingDocument] = useState<{
    uri: string;
    localUri: string;
    name: string;
    mimeType?: string;
    size?: number;
    uploadState?: 'uploading' | 'done' | 'failed';
    uploadError?: string;
    preview?: string;
    truncated?: boolean;
  } | null>(null);
  const [usageInfo, setUsageInfo] = useState<{
    imageGenerate?: { current: number; limit: number; remaining: number };
    imageEdit?: { current: number; limit: number; remaining: number };
  }>({});
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

  // Fetch usage info for attachment sheet
  useEffect(() => {
    const loadUsageInfo = async () => {
      if (!user?.id) return;
      
      const [imageGenerate, imageEdit] = await Promise.all([
        checkUsageLimit(user.id, 'image_generate'),
        checkUsageLimit(user.id, 'image_edit'),
      ]);

      setUsageInfo({
        imageGenerate: {
          current: imageGenerate.current,
          limit: imageGenerate.limit,
          remaining: imageGenerate.remaining,
        },
        imageEdit: {
          current: imageEdit.current,
          limit: imageEdit.limit,
          remaining: imageEdit.remaining,
        },
      });
    };

    loadUsageInfo();
  }, [user?.id]);

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

      // Set uploading state
      setPendingImage({
        uri: previewUri,
        previewUri: previewUri,
        uploadState: 'uploading',
      });

      try {
        const uploadedUrl = await uploadImageToSupabase(asset.uri, user.id, generateUUID());
        const finalImageUri = uploadedUrl || previewUri;

        // Update with success state
        setPendingImage({
          uri: finalImageUri,
          previewUri: previewUri,
          uploadState: uploadedUrl ? 'done' : 'failed',
          uploadError: uploadedUrl ? undefined : 'Kon nie oplaai nie',
        });
      } catch (error: any) {
        // Update with failed state
        setPendingImage({
          uri: previewUri,
          previewUri: previewUri,
          uploadState: 'failed',
          uploadError: error?.message || 'Oplaai het gefaal',
        });
      }

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

      // Try to read document content for preview (only for text files)
      let preview: string | undefined;
      let truncated: boolean | undefined;
      const extension = (asset.name?.split('.').pop() || '').toLowerCase();
      const textExtensions = ['txt', 'md', 'markdown', 'csv', 'json'];
      
      if (textExtensions.includes(extension) && asset.size && asset.size < 2 * 1024 * 1024) {
        try {
          const content = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          if (content && !content.includes('\u0000')) {
            const MAX_PREVIEW = 600;
            truncated = content.length > 12000;
            preview = content.slice(0, MAX_PREVIEW);
          }
        } catch (previewError) {
          // Silently fail preview generation
          console.log('[ChatScreen] Could not generate preview:', previewError);
        }
      }

      // Set uploading state
      setPendingDocument({
        uri: asset.uri,
        localUri: asset.uri,
        name: asset.name ?? 'dokument',
        mimeType: asset.mimeType,
        size: asset.size,
        uploadState: 'uploading',
        preview,
        truncated,
      });

      try {
        const uploadedUrl = await uploadDocumentToSupabase(
          asset.uri,
          user.id,
          generateUUID(),
          asset.name,
          asset.mimeType || 'application/octet-stream'
        );
        
        if (!uploadedUrl) {
          setPendingDocument({
            uri: asset.uri,
            localUri: asset.uri,
            name: asset.name ?? 'dokument',
            mimeType: asset.mimeType,
            size: asset.size,
            uploadState: 'failed',
            uploadError: 'Kon nie oplaai nie',
            preview,
            truncated,
          });
          track('document_upload_failed', { reason: 'upload_failed' });
          return;
        }
        
        const finalDocumentUri = uploadedUrl;
        console.log('[ChatScreen] Document uploaded, setting pending document');

        // Update with success state
        setPendingDocument({
          uri: finalDocumentUri,
          localUri: asset.uri,
          name: asset.name ?? 'dokument',
          mimeType: asset.mimeType,
          size: asset.size,
          uploadState: 'done',
          preview,
          truncated,
        });
      } catch (error: any) {
        setPendingDocument({
          uri: asset.uri,
          localUri: asset.uri,
          name: asset.name ?? 'dokument',
          mimeType: asset.mimeType,
          size: asset.size,
          uploadState: 'failed',
          uploadError: error?.message || 'Oplaai het gefaal',
          preview,
          truncated,
        });
        track('document_upload_failed', { error: error?.message || 'Unknown error' });
      }

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

      // Set uploading state
      setPendingImage({
        uri: previewUri,
        previewUri: previewUri,
        uploadState: 'uploading',
      });

      try {
        const uploadedUrl = await uploadImageToSupabase(asset.uri, user.id, generateUUID());
        const finalImageUri = uploadedUrl || previewUri;
        console.log('[ChatScreen] Image uploaded, setting pending image');

        // Update with success state
        setPendingImage({
          uri: finalImageUri,
          previewUri: previewUri,
          uploadState: uploadedUrl ? 'done' : 'failed',
          uploadError: uploadedUrl ? undefined : 'Kon nie oplaai nie',
        });
      } catch (error: any) {
        setPendingImage({
          uri: previewUri,
          previewUri: previewUri,
          uploadState: 'failed',
          uploadError: error?.message || 'Oplaai het gefaal',
        });
      }

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
        uploadState: 'done', // Already uploaded from modal
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
        uploadState: 'done', // Already uploaded from modal
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
      style={{ flex: 1, backgroundColor: '#E8E2D6' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
    >
      <View className="flex-1 bg-background">
        {/* Header Bar */}
        {showHeader && (
        <View
          className="flex-row items-end justify-between px-4 pb-4 border-b-3 border-borderBlack bg-sand"
          style={{ paddingTop: Math.max(insets.top, 20) + 12 }}
        >
          <TouchableOpacity 
            onPress={() => setShowMenuDrawer(true)} 
            className="w-10 h-10 bg-teal rounded-lg border-2 border-borderBlack items-center justify-center"
          >
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Logo - Centered */}
          <View className="flex-1 items-center justify-center px-4">
            <Image
              source={LOGO}
              style={{ height: 60, width: 60, resizeMode: 'contain' }}
            />
            <Text className="font-heading font-black text-xl text-charcoal -mt-1">
              Klets
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleNewChat} 
            className="w-10 h-10 bg-teal rounded-lg border-2 border-borderBlack items-center justify-center"
          >
            <Ionicons name="pencil" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        )}

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
            <WelcomeState 
              onPromptClick={handlePromptClick} 
              isSending={isSending} 
            />
          }
          refreshControl={<RefreshControl tintColor={ACCENT} refreshing={isRefreshing} onRefresh={handleRefresh} />}
        />

        {isSending && (
          <View className="flex-row items-center justify-center py-2">
            <ActivityIndicator color={ACCENT} size="small" />
            <Text className="ml-2 text-sm text-charcoal font-medium">Koedoe dink…</Text>
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
          onRetryImageUpload={async () => {
            if (!pendingImage || !user?.id) return;
            const localUri = pendingImage.previewUri || pendingImage.uri;
            setPendingImage({ ...pendingImage, uploadState: 'uploading' });
            try {
              const uploadedUrl = await uploadImageToSupabase(localUri, user.id, generateUUID());
              setPendingImage({
                ...pendingImage,
                uri: uploadedUrl || pendingImage.uri,
                uploadState: uploadedUrl ? 'done' : 'failed',
                uploadError: uploadedUrl ? undefined : 'Kon nie oplaai nie',
              });
            } catch (error: any) {
              setPendingImage({
                ...pendingImage,
                uploadState: 'failed',
                uploadError: error?.message || 'Oplaai het gefaal',
              });
            }
          }}
          pendingDocument={pendingDocument}
          onClearPendingDocument={() => setPendingDocument(null)}
          onRetryDocumentUpload={async () => {
            if (!pendingDocument || !user?.id) return;
            setPendingDocument({ ...pendingDocument, uploadState: 'uploading' });
            try {
              const uploadedUrl = await uploadDocumentToSupabase(
                pendingDocument.localUri || pendingDocument.uri,
                user.id,
                generateUUID(),
                pendingDocument.name,
                pendingDocument.mimeType
              );
              if (uploadedUrl) {
                setPendingDocument({
                  ...pendingDocument,
                  uri: uploadedUrl,
                  uploadState: 'done',
                });
              } else {
                setPendingDocument({
                  ...pendingDocument,
                  uploadState: 'failed',
                  uploadError: 'Kon nie oplaai nie',
                });
              }
            } catch (error: any) {
              setPendingDocument({
                ...pendingDocument,
                uploadState: 'failed',
                uploadError: error?.message || 'Oplaai het gefaal',
              });
            }
          }}
          usageInfo={usageInfo}
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
