import { useRef, useState, useEffect } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Image,
  InteractionManager,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { track } from '@/lib/analytics';
import { formatBytes } from '@/lib/utils';

type InputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onTakePhoto?: () => void;
  onEditPhoto?: () => void;
  onAddFiles?: () => void;
  onCreateImage?: () => void;
  onIdentifyPhoto?: () => void;
  isSending?: boolean;
  pendingImage?: { uri: string; previewUri: string } | null;
  onClearPendingImage?: () => void;
  pendingDocument?: { uri: string; localUri?: string; name: string; mimeType?: string; size?: number } | null;
  onClearPendingDocument?: () => void;
};

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

type MenuOption = {
  id: string;
  title: string;
  icon: IoniconsName;
  analyticsKey: string;
  onPress?: () => void;
  dividerAfter?: boolean;
};

const MENU_WIDTH = 250;

export default function InputBar({
  value,
  onChangeText,
  onSend,
  onTakePhoto,
  onEditPhoto,
  onAddFiles,
  onCreateImage,
  onIdentifyPhoto,
  isSending = false,
  pendingImage,
  onClearPendingImage,
  pendingDocument,
  onClearPendingDocument,
}: InputBarProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [menuHeight, setMenuHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const pendingCallbackRef = useRef<{ callback: () => void; analyticsEvent?: string } | null>(null);
  const insets = useSafeAreaInsets();
  const addButtonRef = useRef<TouchableOpacity>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = () => {
    if (value.trim().length === 0 || isSending) {
      return;
    }

    onSend();
  };

  const handleWithClose = (callback?: () => void, analyticsEvent?: string) => {
    if (analyticsEvent) {
      track('chat_plus_action', { action: analyticsEvent });
    }
    
    // Store callback to execute after modal fully dismisses
    if (callback) {
      pendingCallbackRef.current = { callback, analyticsEvent };
    }
    
    // Close menu first
    setMenuAnchor(null);
    setIsMenuVisible(false);
  };

  // Execute pending callback when modal is fully dismissed
  useEffect(() => {
    if (!isMenuVisible && pendingCallbackRef.current) {
      const { callback, analyticsEvent } = pendingCallbackRef.current;
      pendingCallbackRef.current = null;
      
      console.log('[InputBar] Modal dismissed, executing callback:', analyticsEvent);
      // For camera, image picker, and document picker, we need significant time to ensure modal is fully dismissed
      // iOS requires the modal to be completely gone and app to be ready before opening camera/gallery/picker
      const delay = analyticsEvent === 'take_photo' || analyticsEvent === 'identify_photo' || analyticsEvent === 'upload_document' ? 1000 : 300;
      
      // Use InteractionManager to ensure modal animation completes before opening camera
      InteractionManager.runAfterInteractions(() => {
        // Additional delay to ensure modal is fully dismissed and app is ready
        setTimeout(() => {
          try {
            console.log('[InputBar] Calling callback now after', delay, 'ms delay');
            callback();
          } catch (error) {
            console.error('[InputBar] Error executing menu callback:', error);
          }
        }, delay);
      });
    }
  }, [isMenuVisible]);

  const handleOpenMenu = () => {
    track('chat_plus_opened');
    setIsMenuVisible(true);

    if (addButtonRef.current?.measureInWindow) {
      addButtonRef.current.measureInWindow((x, y, width, height) => {
        setMenuAnchor({ x, y, width, height });
      });
    } else {
      setMenuAnchor(null);
    }
  };

  const menuOptions: MenuOption[] = [
    onTakePhoto && {
      id: 'camera',
      title: 'Kamera',
      icon: 'camera-outline',
      analyticsKey: 'take_photo',
      onPress: onTakePhoto,
    },
    onIdentifyPhoto && {
      id: 'photos',
      title: 'Laai Foto Op',
      icon: 'images-outline',
      analyticsKey: 'identify_photo',
      onPress: onIdentifyPhoto,
    },
    onAddFiles && {
      id: 'files',
      title: 'Dokumente',
      icon: 'document-text-outline',
      analyticsKey: 'upload_document',
      onPress: onAddFiles,
      dividerAfter: true,
    },
    onCreateImage && {
      id: 'create-image',
      title: 'Skep Prent',
      icon: 'sparkles-outline',
      analyticsKey: 'create_image',
      onPress: onCreateImage,
    },
    onEditPhoto && {
      id: 'edit-image',
      title: 'Wysig Prent',
      icon: 'color-wand-outline',
      analyticsKey: 'edit_photo',
      onPress: onEditPhoto,
    },
  ].filter((option): option is MenuOption => Boolean(option));

  const getMenuPositionStyle = () => {
    if (!menuAnchor) {
      return {
        left: 24,
        bottom: insets.bottom + 120,
      };
    }

    const estimatedHeight = menuHeight || 220;
    const topSpacing = 12;
    const tentativeTop = menuAnchor.y - estimatedHeight - topSpacing;
    const top = Math.max(insets.top + 24, tentativeTop);

    const anchorCenterX = menuAnchor.x + menuAnchor.width / 2;
    const tentativeLeft = anchorCenterX - MENU_WIDTH / 2;
    const left = Math.min(Math.max(tentativeLeft, 16), screenWidth - MENU_WIDTH - 16);

    const maxTop = screenHeight - estimatedHeight - (insets.bottom + 16);

    return {
      left,
      top: Math.min(top, maxTop),
    };
  };

  return (
    <>
      <View
        className="border-t border-border bg-background px-4 py-3"
        style={{ 
          paddingBottom: isKeyboardVisible ? 4 : Math.max(insets.bottom, 16),
          backgroundColor: '#1A1A1A',
        }}
      >
        {pendingImage && (
          <View className="mb-3 relative">
            <View className="rounded-xl overflow-hidden border border-border bg-card">
              <Image
                source={{ uri: pendingImage.previewUri || pendingImage.uri }}
                className="w-full"
                style={{ height: 200, maxHeight: 300 }}
                resizeMode="contain"
              />
              <TouchableOpacity
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 items-center justify-center"
                onPress={onClearPendingImage}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {pendingDocument && (
          <View className="mb-3 relative">
            <View className="rounded-xl border border-border bg-card p-4 flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-accent/20 items-center justify-center mr-3">
                <Ionicons name="document-text" size={24} color="#B46E3A" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-base text-foreground" numberOfLines={1}>
                  {pendingDocument.name}
                </Text>
                {pendingDocument.size && (
                  <Text className="text-xs text-muted mt-0.5">
                    {formatBytes(pendingDocument.size)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="w-7 h-7 rounded-full bg-black/60 items-center justify-center ml-2"
                onPress={onClearPendingDocument}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View className="flex-row items-end gap-3">
          <TouchableOpacity
            ref={addButtonRef}
            className="rounded-full bg-card w-11 h-11 items-center justify-center mb-0.5"
            onPress={handleOpenMenu}
            accessibilityLabel="Voeg by"
            activeOpacity={0.6}
          >
            <Ionicons name="add" size={28} color="#E8E2D6" />
          </TouchableOpacity>

          <View className="flex-1 rounded-2xl bg-background border border-border px-4 py-2.5 min-h-[44px] justify-center">
            <TextInput
              className="font-normal text-base text-foreground"
              placeholder="Vra Koedoe"
              placeholderTextColor="#8E8EA0"
              value={value}
              onChangeText={onChangeText}
              multiline
              textAlignVertical="top"
              autoCorrect
              autoCapitalize="sentences"
              style={{ minHeight: 20, maxHeight: 100, paddingVertical: 0 }}
            />
          </View>

          <TouchableOpacity
            className="rounded-full bg-accent w-11 h-11 items-center justify-center mb-0.5"
            onPress={handleSend}
            disabled={isSending || (value.trim().length === 0 && !pendingImage && !pendingDocument)}
            accessibilityLabel="Stuur boodskap"
            activeOpacity={0.8}
            style={{ opacity: (value.trim().length === 0 && !pendingImage && !pendingDocument) ? 0.5 : 1 }}
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal animationType="fade" transparent visible={isMenuVisible} onRequestClose={() => handleWithClose()}>
        <View className="flex-1">
          <Pressable className="flex-1 bg-black/55" onPress={() => handleWithClose()}>
            {/* Tap outside to close */}
          </Pressable>

          {menuOptions.length > 0 && (
            <View pointerEvents="box-none" className="absolute inset-0">
          <View
                className="absolute rounded-[32px] bg-[#121212] border border-[#2A2A2A] shadow-2xl shadow-black/80 overflow-hidden"
                style={[{ width: MENU_WIDTH }, getMenuPositionStyle()]}
                onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}
              >
                {menuOptions.map((option, index) => (
                  <View key={option.id}>
                <TouchableOpacity
                      className="flex-row items-center gap-3 px-4 py-3 active:bg-[#1F1F1F]"
                      onPress={() => handleWithClose(option.onPress, option.analyticsKey)}
                    activeOpacity={0.85}
                    >
                      <View className="w-11 h-11 rounded-full bg-[#1E1E1E] items-center justify-center">
                        <Ionicons name={option.icon} size={22} color="#F2F0E6" />
                    </View>
                      <Text className="text-base font-semibold text-[#F2F0E6]">{option.title}</Text>
                    </TouchableOpacity>
                    {option.dividerAfter && index !== menuOptions.length - 1 && (
                      <View className="mx-4 h-px bg-[#252525]" />
                    )}
                  </View>
                ))}
              </View>
            </View>
            )}
          </View>
      </Modal>
    </>
  );
}
