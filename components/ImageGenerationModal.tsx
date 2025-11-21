import { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { generateImage } from '@/lib/openai';
import { uploadImageToSupabase } from '@/lib/storage';
import { track } from '@/lib/analytics';

const ACCENT = '#B46E3A';

const EXAMPLE_PROMPTS = [
  "n sononder in die Karoo met bergs op die agtergrond",
  "n moderne huis met 'n braai area",
  "n Afrikaanse familie by 'n braai",
  "Table Mountain met die stad op die voorgrond",
];

type StylePreset = {
  id: string;
  label: string;
  prefix: string;
};

const STYLE_PRESETS: StylePreset[] = [
  { id: 'realistic', label: 'Realisties', prefix: 'Realistiese foto van' },
  { id: 'artistic', label: 'Artistiek', prefix: 'Artistieke illustrasie van' },
  { id: 'abstract', label: 'Abstrak', prefix: 'Abstrakte visuele voorstelling van' },
  { id: 'sketch', label: 'Skets', prefix: 'Skets-styl tekening van' },
];

type ImageGenerationModalProps = {
  visible: boolean;
  onClose: () => void;
  onImageGenerated: (imageUri: string, previewUri: string) => void;
  userId: string;
  messageId: string;
};

export default function ImageGenerationModal({
  visible,
  onClose,
  onImageGenerated,
  userId,
  messageId,
}: ImageGenerationModalProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<StylePreset | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedImageUri, setGeneratedImageUri] = useState<string | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (visible) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      setPrompt('');
      setSelectedStyle(null);
      setStatusMessage('');
      setGeneratedImageUri(null);
      setPreviewImageUri(null);
    }
  }, [visible]);

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      Alert.alert('Oeps!', 'Voer asseblief \'n beskrywing in vir die beeld.');
      return;
    }

    Keyboard.dismiss();
    setIsGenerating(true);
    setStatusMessage('Skep beeld...');

    try {
      // Apply style preset if selected
      const finalPrompt = selectedStyle 
        ? `${selectedStyle.prefix} ${trimmedPrompt}`
        : trimmedPrompt;

      track('image_generation_started', { 
        hasStylePreset: !!selectedStyle,
        stylePreset: selectedStyle?.id 
      });

      setStatusMessage('Skep beeld met AI...');
      const imageUrl = await generateImage(finalPrompt, {
        thinkingLevel: 'low',
        mediaResolution: 'media_resolution_high',
      });
      
      if (!imageUrl) {
        throw new Error('Geen beeld ontvang nie.');
      }

      setStatusMessage('Laai beeld op...');
      const uploadedUrl = await uploadImageToSupabase(imageUrl, userId, messageId);
      const finalImageUri = uploadedUrl || imageUrl;
      
      // Show preview instead of immediately closing
      setGeneratedImageUri(finalImageUri);
      setPreviewImageUri(imageUrl); // Use local file as preview
      setStatusMessage('');
      setPrompt('');
      
      track('image_generation_preview_shown');
    } catch (error: any) {
      console.error('Beeld generasie gefaal:', error);
      setStatusMessage('');
      
      track('image_generation_error', { 
        error: error?.message || 'Unknown error' 
      });
      
      // More user-friendly error messages
      let errorMessage = 'Kon nie beeld skep nie. Probeer asseblief weer.';
      if (error?.message) {
        if (error.message.includes('API key')) {
          errorMessage = 'Gemini API sleutel ontbreek. Kontroleer jou omgewingsveranderlikes.';
        } else if (error.message.includes('limiet') || error.message.includes('rate')) {
          errorMessage = 'Te veel versoeke. Wag asseblief \'n oomblik en probeer weer.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Oeps!', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExamplePress = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    inputRef.current?.focus();
  };

  const handleAccept = () => {
    if (generatedImageUri && previewImageUri) {
      track('image_generation_accepted');
      onImageGenerated(generatedImageUri, previewImageUri);
      onClose();
    }
  };

  const handleRetry = () => {
    track('image_generation_retry');
    setGeneratedImageUri(null);
    setPreviewImageUri(null);
    setPrompt('');
    setSelectedStyle(null);
  };

  const handleCancel = () => {
    track('image_generation_cancelled', {
      hasGeneratedImage: !!generatedImageUri,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity 
          className="flex-1" 
          activeOpacity={1} 
          onPress={isGenerating ? undefined : onClose}
        />
        <View className="bg-background rounded-t-3xl border-t border-border max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-border">
            <View className="flex-1">
              <Text className="font-heading font-semibold text-2xl text-foreground">
                Skep beeld met AI
              </Text>
              <Text className="mt-1 font-normal text-sm text-muted">
                Beskryf die beeld wat jy wil skep
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isGenerating}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="#E8E2D6" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-6">
              {/* Input Field */}
              <View className="mb-4">
                <Text className="mb-2 font-medium text-base text-foreground">
                  Jou beskrywing
                </Text>
                <TextInput
                  ref={inputRef}
                  className="rounded-xl border-2 border-border bg-card px-4 py-4 font-normal text-base text-foreground min-h-[100px]"
                  placeholder="Tik hier om jou beeld te beskryf..."
                  placeholderTextColor="#8E8EA0"
                  value={prompt}
                  onChangeText={setPrompt}
                  multiline
                  textAlignVertical="top"
                  editable={!isGenerating}
                  returnKeyType="done"
                  onSubmitEditing={handleGenerate}
                />
              </View>

              {/* Style Presets */}
              {!isGenerating && (
                <View className="mb-4">
                  <Text className="mb-3 font-medium text-sm text-muted">
                    Styl:
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {STYLE_PRESETS.map((style) => (
                      <TouchableOpacity
                        key={style.id}
                        onPress={() => {
                          setSelectedStyle(selectedStyle?.id === style.id ? null : style);
                          track('image_generation_style_selected', { styleId: style.id });
                        }}
                        className={`rounded-lg border px-3 py-2 ${
                          selectedStyle?.id === style.id
                            ? 'bg-accent border-accent'
                            : 'bg-card border-border'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text 
                          className={`font-normal text-xs ${
                            selectedStyle?.id === style.id
                              ? 'text-white'
                              : 'text-foreground'
                          }`}
                        >
                          {style.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Example Prompts */}
              {!prompt.trim() && !isGenerating && (
                <View className="mb-4">
                  <Text className="mb-3 font-medium text-sm text-muted">
                    Voorbeelde:
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((example, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleExamplePress(example)}
                        className="rounded-lg bg-card border border-border px-3 py-2"
                        activeOpacity={0.7}
                      >
                        <Text className="font-normal text-xs text-foreground" numberOfLines={1}>
                          {example}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Generated Image Preview */}
              {generatedImageUri && previewImageUri ? (
                <View className="mb-4">
                  <View className="rounded-xl overflow-hidden border-2 border-border bg-card">
                    <Image
                      source={{ uri: previewImageUri }}
                      className="w-full"
                      style={{ height: 300, maxHeight: 400 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View className="mt-4 flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 rounded-xl bg-accent px-6 py-4 flex-row items-center justify-center gap-2"
                      onPress={handleAccept}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text className="font-semibold text-center text-base text-white">
                        Gebruik beeld
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="rounded-xl bg-card border-2 border-border px-6 py-4"
                      onPress={handleRetry}
                      activeOpacity={0.8}
                    >
                      <Text className="font-medium text-center text-base text-foreground">
                        Probeer weer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* Status Message */}
              {statusMessage ? (
                <View className="mb-4 flex-row items-center gap-2 rounded-lg bg-card border border-border px-4 py-3">
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text className="font-medium text-sm text-foreground">{statusMessage}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              {!generatedImageUri && (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={`flex-1 rounded-xl px-6 py-4 flex-row items-center justify-center gap-2 ${
                      isGenerating || !prompt.trim() 
                        ? 'bg-accent/50' 
                        : 'bg-accent'
                    }`}
                    onPress={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    activeOpacity={0.8}
                  >
                    {isGenerating ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text className="font-semibold text-center text-base text-white">
                          Skep beeld...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                        <Text className="font-semibold text-center text-base text-white">
                          Skep beeld
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="rounded-xl bg-card border-2 border-border px-6 py-4"
                    onPress={handleCancel}
                    disabled={isGenerating}
                    activeOpacity={0.8}
                  >
                    <Text className="font-medium text-center text-base text-foreground">
                      Kanselleer
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

