import { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { generateImage } from '@/lib/openai';
import { uploadImageToSupabase } from '@/lib/storage';

const ACCENT = '#DE7356';

const EXAMPLE_PROMPTS = [
  "n sononder in die Karoo met bergs op die agtergrond",
  "n moderne huis met 'n braai area",
  "n Afrikaanse familie by 'n braai",
  "Table Mountain met die stad op die voorgrond",
];

type ImageGenerationModalProps = {
  visible: boolean;
  onClose: () => void;
  onImageGenerated: (imageUrl: string) => void;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (visible) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      setPrompt('');
      setStatusMessage('');
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
      setStatusMessage('Skep beeld met AI...');
      const imageUrl = await generateImage(trimmedPrompt);
      
      if (!imageUrl) {
        throw new Error('Geen beeld ontvang nie.');
      }

      setStatusMessage('Laai beeld op...');
      const uploadedUrl = await uploadImageToSupabase(imageUrl, userId, messageId);
      
      setStatusMessage('Voltooi!');
      onImageGenerated(uploadedUrl || imageUrl);
      setPrompt('');
      
      // Small delay to show success message
      setTimeout(() => {
        onClose();
        setStatusMessage('');
      }, 500);
    } catch (error: any) {
      console.error('Beeld generasie gefaal:', error);
      setStatusMessage('');
      
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
              onPress={onClose}
              disabled={isGenerating}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="#2C2C2C" />
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

              {/* Status Message */}
              {statusMessage ? (
                <View className="mb-4 flex-row items-center gap-2 rounded-lg bg-card border border-border px-4 py-3">
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text className="font-medium text-sm text-foreground">{statusMessage}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
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
                  onPress={onClose}
                  disabled={isGenerating}
                  activeOpacity={0.8}
                >
                  <Text className="font-medium text-center text-base text-foreground">
                    Kanselleer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

