import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestCameraPermission, requestMediaLibraryPermission } from '@/lib/permissions';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import InputBar from '@/components/InputBar';
import MenuDrawer from '@/components/MenuDrawer';
import AfricanLandscapeWatermark from '@/components/AfricanLandscapeWatermark';
import ImageGenerationModal from '@/components/ImageGenerationModal';
import ImageEditModal from '@/components/ImageEditModal';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  streamAfrikaansMessage,
  OpenAIChatMessage,
  identifyImageSubject,
  answerQuestionAboutDocument,
  generateConversationTitle,
  extractMemoriesFromConversation,
} from '@/lib/openai';
import { uploadImageToSupabase, uploadDocumentToSupabase } from '@/lib/storage';
import { checkUsageLimit, logUsage, getTodayUsage, USAGE_LIMITS, getUserTier } from '@/lib/usageLimits';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import { useMemoryStore } from '@/store/memoryStore';
import { useUserStore } from '@/store/userStore';
import { generateUUID } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { ChatProvider, useChatContext } from '@/chat/ChatContext';
import { ChatMessagesList } from '@/chat/components/ChatMessagesList';

const ACCENT = '#DE7356'; // Copper
const CHARCOAL = '#1A1A1A';
const SAND = '#E8E2D6';
const LOGO = require('../../assets/branding/koedoelogo.png');
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];
const LAST_SESSION_END_KEY = 'koedoe.lastSessionEnd';
const SESSION_RESET_THRESHOLD_MS = 1000 * 60 * 5; // 5 minute inactivity pauses trigger a reset
let hasInitializedChatSession = false;

const SAMPLE_PROMPTS = [
  "🦾 Maak vir my 'n oefenprogram",
  "🍳 Beplan my maaltye vir die week",
  "🎓 Help my met studies",
  "🧾 Skryf vir my 'n dokument",
];

export default function ChatScreen({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <ChatProvider>
      <ChatScreenContent showHeader={showHeader} />
    </ChatProvider>
  );
}

function ChatScreenContent({ showHeader = true }: { showHeader?: boolean }) {
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
  const stopStreamingRef = useRef(false);
  const { scrollToEnd, setComposerHeight, setMessageSendAnimating, listRef } = useChatContext();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const memoryContext = useMemo(() => {
    const safeMemories = Array.isArray(memories) ? memories : [];
    const segments: string[] = [];

    if (user?.displayName) {
      segments.push(`Naam: ${user.displayName}`);
    }

    safeMemories.slice(0, 8).forEach((memory) => {
      const condensed = memory.content.replace(/\s+/g, ' ').trim();
      segments.push(`${memory.title}: ${condensed}`);
    });

    const combined = segments.join(' | ');
    if (combined.length === 0) {
      return '';
    }
    return combined.length > 800 ? `${combined.slice(0, 800)}...` : combined;
  }, [memories, user?.displayName]);

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
  const resetChatSession = useChatStore((state) => state.resetSession);
  const memories = useMemoryStore((state) => state.memories);
  const loadMemories = useMemoryStore((state) => state.loadMemories);
  const addMemory = useMemoryStore((state) => state.addMemory);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (!hasInitializedChatSession) {
      hasInitializedChatSession = true;
      handleNewChat();
    }
  }, [handleNewChat, user?.id]);

  useEffect(() => {
    if (!user) {
      hasInitializedChatSession = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    loadMemories(user.id);
  }, [loadMemories, user?.id]);


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
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground =
        appStateRef.current === 'background' || appStateRef.current === 'inactive';

      if (nextState === 'background' || nextState === 'inactive') {
        AsyncStorage.setItem(LAST_SESSION_END_KEY, Date.now().toString()).catch((error) => {
          console.warn('Kon nie sessie-einde tyd stoor nie:', error);
        });
      } else if (wasBackground && nextState === 'active') {
        AsyncStorage.getItem(LAST_SESSION_END_KEY)
          .then((raw) => {
            if (!raw) {
              return;
            }
            const lastBackground = Number(raw);
            if (!Number.isNaN(lastBackground)) {
              const elapsed = Date.now() - lastBackground;
              if (elapsed >= SESSION_RESET_THRESHOLD_MS) {
                handleNewChat();
              }
            }
          })
          .catch((error) => {
            console.warn('Kon nie sessie-einde tyd lees nie:', error);
          });
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [handleNewChat]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToEnd({ animated: true });
    });
  }, [messages, scrollToEnd]);

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

    // Set sending flag IMMEDIATELY to prevent double-tap
    setIsSending(true);

    if (messages.length === 0) {
      setMessageSendAnimating(true);
    }

    // Check usage limit before sending
    const usageCheck = await checkUsageLimit(user.id, 'chat');
    if (!usageCheck.allowed) {
      setIsSending(false); // Reset on limit failure
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

      let resolvedTitle = fallbackTitle;

      if (trimmed.length > 0) {
        try {
          const generated = await generateConversationTitle(trimmed);
          if (generated) {
            resolvedTitle = generated;
          }
        } catch (error) {
          console.warn('Kon nie gesprekstitel genereer nie:', error);
          resolvedTitle = trimmed.length > 60 ? `${trimmed.substring(0, 60)}...` : trimmed;
        }
      }

      await updateConversation(conversationId, resolvedTitle);
    }

    await saveMessageToSupabase(userMessage, user.id);
    
    // Log usage after successful message save
    await logUsage(user.id, 'chat');

    if (trimmed.length > 0) {
      try {
        const recentMessages = useChatStore
          .getState()
          .messages.slice(-10)
          .map<OpenAIChatMessage>((msg) => ({
            role: msg.role,
            content:
              msg.content && msg.content.length > 0
                ? msg.content
                : msg.imageUri
                  ? '(Beeld gestuur)'
                  : msg.documentUrl
                    ? '(Dokument gestuur)'
                    : '',
          }))
          .filter((msg) => msg.content.length > 0);

        const extractedMemories = await extractMemoriesFromConversation(
          recentMessages,
          trimmed,
        );

        if (extractedMemories.length > 0 && user?.id) {
          const memoryState = useMemoryStore.getState();
          const seenTitles = new Set(
            memoryState.memories.map((memory) => memory.title.toLowerCase()),
          );
          const seenContents = new Set(
            memoryState.memories.map((memory) => memory.content.toLowerCase()),
          );

          let savedCount = 0;

          for (const memory of extractedMemories.slice(0, 2)) {
            const titleKey = memory.title.toLowerCase();
            const contentKey = memory.content.toLowerCase();
            if (seenTitles.has(titleKey) || seenContents.has(contentKey)) {
              continue;
            }
            const saved = await addMemory(user.id, memory);
            if (saved) {
              seenTitles.add(titleKey);
              seenContents.add(contentKey);
              savedCount += 1;
            }
          }

          if (savedCount > 0) {
            track('memory_auto_saved', { count: savedCount });
          }
        }
      } catch (error) {
        console.warn('Kon nie nuwe herinneringe outomaties stoor nie:', error);
      }
    }

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

        // Throttled streaming for smooth text appearance
        let buffer = '';
        let fullContent = '';
        const THROTTLE_MS = 50;
        let streamEnded = false;
        let wasStopped = false;
        
        // Reset stop flag at start
        stopStreamingRef.current = false;

        const flushBuffer = () => {
          if (buffer.length > 0) {
            // Release characters in small batches for smooth appearance
            const charsToRelease = Math.max(1, Math.ceil(buffer.length / 3));
            fullContent += buffer.slice(0, charsToRelease);
            buffer = buffer.slice(charsToRelease);
            updateMessage(assistantMessageId, { content: fullContent });
          }
        };

        const interval = setInterval(flushBuffer, THROTTLE_MS);

        try {
          for await (const chunk of streamAfrikaansMessage(
            history,
            user.tonePreset || 'informeel',
            memoryContext,
          )) {
            // Check if user requested to stop
            if (stopStreamingRef.current) {
              wasStopped = true;
              break;
            }
            buffer += chunk;
          }
          streamEnded = true;
        } finally {
          clearInterval(interval);
          // Flush any remaining buffer
          if (buffer.length > 0) {
            fullContent += buffer;
            buffer = '';
            updateMessage(assistantMessageId, { content: fullContent });
          }
        }

        // Save whatever content we got (even if stopped early)
        if (fullContent.length > 0) {
          await saveMessageToSupabase({ ...assistantMessage, content: fullContent }, user.id);
        }
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

  const handleNewChat = useCallback(() => {
    if (!user?.id) {
      return;
    }

    // Set flag to prevent useEffect from reloading messages
    isStartingNewChat.current = true;
    resetChatSession();
    setInput('');
    setPendingImage(null);
    setPendingDocument(null);
    
    // Scroll to top immediately
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    setMessageSendAnimating(false);
  }, [listRef, resetChatSession, setInput, setPendingDocument, setPendingImage, setMessageSendAnimating, user?.id]);

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

      scrollToEnd({ animated: true });
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

      scrollToEnd({ animated: true });
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

      scrollToEnd({ animated: true });
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

      scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Kon nie beeld wysiging verwerk nie:', error);
      track('image_edit_failed');
      Alert.alert('Oeps!', 'Kon nie beeld wysiging verwerk nie. Probeer asseblief weer.');
    }
  };

  const promptSuggestions = SAMPLE_PROMPTS;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: SAND }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
    >
      <View style={{ flex: 1 }}>
        {showHeader && (
          <View className="bg-sand z-10" style={{ paddingTop: Math.max(insets.top + 4, 16) }}>
            <View className="flex-row items-center justify-between px-4 pb-3">
              <View className="w-12 items-start">
                <TouchableOpacity
                  onPress={() => setShowMenuDrawer(true)}
                  className="w-10 h-10 bg-white rounded-xl border-2 border-charcoal items-center justify-center shadow-brutal-sm active:translate-y-1 active:shadow-none"
                >
                  <Ionicons name="menu" size={22} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-2 bg-yellow/20 px-3 py-1 rounded-xl border-2 border-transparent">
                <Image source={LOGO} style={{ height: 24, width: 24, resizeMode: 'contain' }} />
                <Text className="font-heading font-black text-lg text-charcoal">Klets</Text>
              </View>
              <View className="w-12 items-end">
                <TouchableOpacity
                  onPress={handleNewChat}
                  className="w-10 h-10 bg-white rounded-xl border-2 border-charcoal items-center justify-center shadow-brutal-sm active:translate-y-1 active:shadow-none"
                >
                  <Ionicons name="create-outline" size={22} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
            </View>
            <View className="border-b-2 border-charcoal w-full opacity-10" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <AfricanLandscapeWatermark size={280} opacity={0.06} />
          
          {messages.length === 0 ? (
            <ScrollView 
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
            >
              <View className="bg-yellow p-5 rounded-2xl border-2 border-charcoal shadow-brutal self-start max-w-[85%] mb-8 transform rotate-1">
                 <Text className="text-charcoal text-lg leading-6 font-bold">
                   Hallo! Waarmee kan ek jou help vandag? 😊
                 </Text>
              </View>
  
              <Text className="text-charcoal font-black mb-4 ml-1 text-lg uppercase tracking-wide">Probeer hierdie idees</Text>
              
              <View className="flex-row flex-wrap gap-3">
                {promptSuggestions.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => handlePromptClick(prompt)}
                    disabled={isSending}
                    activeOpacity={0.7}
                    className="px-5 py-3 rounded-full border-2 border-charcoal bg-white mb-2 flex-row items-center shadow-brutal-sm active:translate-y-[2px] active:shadow-none"
                    style={{ opacity: isSending ? 0.6 : 1 }}
                  >
                    <Text className="text-sm font-bold text-charcoal">{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ChatMessagesList
              messages={messages}
              ListEmptyComponent={null}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>

        <InputBar
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          onStop={() => {
            stopStreamingRef.current = true;
            track('chat_stream_stopped');
          }}
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
          onComposerLayout={setComposerHeight}
        />
      </View>

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
    </KeyboardAvoidingView>
  );
}
