import { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { track } from "@/lib/analytics";
import { formatBytes } from "@/lib/utils";
import AttachmentSheet, { AttachmentAction } from "./AttachmentSheet";
import DocumentPreview from "./DocumentPreview";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACCENT = '#DE7356'; // Copper
const TEXT_COLOR = '#1A1A1A'; // Charcoal
const BORDER_COLOR = '#000000'; // Black

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
  pendingImage?: {
    uri: string;
    previewUri: string;
    uploadState?: 'uploading' | 'done' | 'failed';
    uploadError?: string;
  } | null;
  onClearPendingImage?: () => void;
  onRetryImageUpload?: () => void;
  pendingDocument?: {
    uri: string;
    localUri?: string;
    name: string;
    mimeType?: string;
    size?: number;
    uploadState?: 'uploading' | 'done' | 'failed';
    uploadError?: string;
    preview?: string;
    truncated?: boolean;
  } | null;
  onClearPendingDocument?: () => void;
  onRetryDocumentUpload?: () => void;
  usageInfo?: {
    imageGenerate?: { current: number; limit: number; remaining: number };
    imageEdit?: { current: number; limit: number; remaining: number };
  };
};

// Animated send button with pulse effect when ready
function AnimatedSendButton({
  onPress,
  disabled,
  isSending,
  isReady,
}: {
  onPress: () => void;
  disabled: boolean;
  isSending: boolean;
  isReady: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when ready to send
  useEffect(() => {
    if (isReady && !isSending) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isReady, isSending, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [
          { scale: Animated.multiply(scaleAnim, pulseAnim) },
        ],
      }}
    >
      <TouchableOpacity
        className="rounded-full bg-copper w-10 h-10 items-center justify-center border-2 border-borderBlack"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityLabel="Stuur boodskap"
        activeOpacity={1}
        style={{
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isSending ? (
          <ActivityIndicator color="#F7F3EE" size="small" />
        ) : (
          <Ionicons name="arrow-up" size={20} color="#F7F3EE" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Animated attachment button
function AnimatedAttachmentButton({ onPress }: { onPress: () => void }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        friction: 5,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { rotate }],
      }}
    >
      <TouchableOpacity
        className="rounded-full bg-yellow w-10 h-10 items-center justify-center border-2 border-borderBlack"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Ionicons name="add" size={24} color={TEXT_COLOR} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Animated pending attachment container
function AnimatedAttachmentPreview({ children, onClear }: { children: React.ReactNode; onClear?: () => void }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{
          translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        }],
      }}
      className="mb-3"
    >
      {children}
    </Animated.View>
  );
}

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
  onRetryImageUpload,
  pendingDocument,
  onClearPendingDocument,
  onRetryDocumentUpload,
  usageInfo,
}: InputBarProps) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const textInputRef = useRef<TextInput>(null);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Animate border on focus
  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, borderAnim]);

  const handleSend = () => {
    if (isSending) return;
    onSend();
  };

  const handleAttachmentPress = () => {
    track("chat_plus_action", { action: "attachment_menu_opened" });
    setShowAttachmentSheet(true);
  };

  const handleAttachmentSelect = (action: AttachmentAction) => {
    track("chat_plus_action", { action });
    
    switch (action) {
      case 'camera':
        onTakePhoto?.();
        break;
      case 'gallery':
        onIdentifyPhoto?.();
        break;
      case 'document':
        onAddFiles?.();
        break;
      case 'create_image':
        onCreateImage?.();
        break;
      case 'edit_image':
        onEditPhoto?.();
        break;
    }
  };

  const handleClearImage = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onClearPendingImage?.();
  };

  const handleClearDocument = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onClearPendingDocument?.();
  };

  const isReady = (value.trim().length > 0 || !!pendingImage || !!pendingDocument) &&
    pendingImage?.uploadState !== 'uploading' &&
    pendingImage?.uploadState !== 'failed' &&
    pendingDocument?.uploadState !== 'uploading' &&
    pendingDocument?.uploadState !== 'failed';

  const isDisabled = isSending ||
    (value.trim().length === 0 && !pendingImage && !pendingDocument) ||
    pendingImage?.uploadState === 'uploading' ||
    pendingImage?.uploadState === 'failed' ||
    pendingDocument?.uploadState === 'uploading' ||
    pendingDocument?.uploadState === 'failed';

  return (
    <View
      className="px-4 pb-4 pt-2 bg-transparent"
      style={{
        marginBottom: isKeyboardVisible ? 0 : Math.max(insets.bottom + 12, 24),
      }}
    >
      {/* Pending Image Preview */}
      {pendingImage && (
        <AnimatedAttachmentPreview>
          <View className="rounded-xl overflow-hidden border-2 border-borderBlack bg-white">
            <Image
              source={{ uri: pendingImage.previewUri || pendingImage.uri }}
              className="w-full"
              style={{ height: 200, maxHeight: 300 }}
              resizeMode="contain"
            />
            {pendingImage.uploadState === 'uploading' && (
              <View className="absolute inset-0 bg-black/40 items-center justify-center">
                <ActivityIndicator size="large" color={ACCENT} />
                <Text className="text-white text-sm mt-2">Laai op...</Text>
              </View>
            )}
            {pendingImage.uploadState === 'failed' && (
              <View className="absolute inset-0 bg-black/60 items-center justify-center p-4">
                <Ionicons name="alert-circle" size={24} color="#F87171" />
                <Text className="text-white text-sm mt-2 text-center">
                  {pendingImage.uploadError || 'Oplaai het gefaal'}
                </Text>
                {onRetryImageUpload && (
                  <TouchableOpacity
                    className="mt-3 bg-accent px-4 py-2 rounded-lg"
                    onPress={onRetryImageUpload}
                    activeOpacity={0.7}
                  >
                    <Text className="text-white font-semibold text-sm">Probeer weer</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {pendingImage.uploadState === 'done' && (
              <View className="absolute top-2 left-2 bg-success/90 rounded-full px-2 py-1 flex-row items-center">
                <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                <Text className="text-white text-xs ml-1 font-medium">Gereed</Text>
              </View>
            )}
            <TouchableOpacity
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
              onPress={handleClearImage}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </AnimatedAttachmentPreview>
      )}

      {/* Pending Document Preview */}
      {pendingDocument && (
        <AnimatedAttachmentPreview>
          <View className="rounded-xl border-2 border-borderBlack bg-white p-4">
            {pendingDocument.uploadState === 'uploading' && (
              <View className="absolute inset-0 bg-black/40 rounded-xl items-center justify-center z-10">
                <ActivityIndicator size="large" color={ACCENT} />
                <Text className="text-white text-sm mt-2">Laai op...</Text>
              </View>
            )}
            {pendingDocument.preview ? (
              <View className="relative">
                <DocumentPreview
                  name={pendingDocument.name}
                  size={pendingDocument.size}
                  mimeType={pendingDocument.mimeType}
                  preview={pendingDocument.preview}
                  truncated={pendingDocument.truncated}
                  compact={true}
                />
                <TouchableOpacity
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                  onPress={handleClearDocument}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-accent/20 items-center justify-center mr-3">
                  <Ionicons name="document-text" size={24} color={ACCENT} />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-semibold text-base text-charcoal"
                    numberOfLines={1}
                  >
                    {pendingDocument.name}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    {pendingDocument.size && (
                      <Text className="text-xs text-charcoal/60">
                        {formatBytes(pendingDocument.size)}
                      </Text>
                    )}
                    {pendingDocument.uploadState === 'done' && (
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
                        <Text className="text-xs text-success ml-1">Gereed</Text>
                      </View>
                    )}
                  </View>
                  {pendingDocument.uploadState === 'failed' && (
                    <Text className="text-xs text-error mt-1">
                      {pendingDocument.uploadError || 'Oplaai het gefaal'}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  className="w-8 h-8 rounded-full bg-black/60 items-center justify-center ml-2"
                  onPress={handleClearDocument}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
            {pendingDocument.uploadState === 'failed' && onRetryDocumentUpload && (
              <TouchableOpacity
                className="mt-3 bg-accent/20 border border-accent px-4 py-2 rounded-lg flex-row items-center justify-center"
                onPress={onRetryDocumentUpload}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color={ACCENT} />
                <Text className="text-accent font-semibold text-sm ml-2">Probeer weer</Text>
              </TouchableOpacity>
            )}
          </View>
        </AnimatedAttachmentPreview>
      )}

      {/* Input Row */}
      <View 
        className="flex-row items-end bg-white rounded-3xl border-3 border-borderBlack shadow-brutal-sm overflow-hidden pl-3 pr-2 py-2"
      >
        <View className="mb-1 mr-2">
          <TouchableOpacity
            onPress={handleAttachmentPress}
            className="w-8 h-8 items-center justify-center rounded-full bg-charcoal"
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TextInput
          ref={textInputRef}
          className="flex-1 font-medium text-base text-charcoal min-h-[40px] max-h-[100px] pt-2.5 pb-2.5"
          placeholder="Vra Koedoe..."
          placeholderTextColor="#8E8EA0"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline
          textAlignVertical="center"
          autoCorrect
          autoCapitalize="sentences"
        />

        <View className="mb-0.5">
          <AnimatedSendButton
            onPress={handleSend}
            disabled={isDisabled}
            isSending={isSending}
            isReady={isReady}
          />
        </View>
      </View>

      <AttachmentSheet
        visible={showAttachmentSheet}
        onClose={() => setShowAttachmentSheet(false)}
        onSelect={handleAttachmentSelect}
        usageInfo={usageInfo}
      />
    </View>
  );
}
