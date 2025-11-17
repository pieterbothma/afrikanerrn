import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';

import BrutalistCard from './BrutalistCard';
import { generateImage } from '@/lib/openai';
import { uploadImageToSupabase } from '@/lib/storage';

const ACCENT = '#DE7356';

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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Oeps!', 'Voer asseblief \'n beskrywing in vir die beeld.');
      return;
    }

    setIsGenerating(true);
    try {
      const imageUrl = await generateImage(prompt);
      if (imageUrl) {
        const uploadedUrl = await uploadImageToSupabase(imageUrl, userId, messageId);
        onImageGenerated(uploadedUrl || imageUrl);
        setPrompt('');
        onClose();
      } else {
        Alert.alert('Oeps!', 'Kon nie beeld skep nie. Probeer asseblief weer.');
      }
    } catch (error) {
      console.error('Beeld generasie gefaal:', error);
      Alert.alert('Oeps!', 'Kon nie beeld skep nie. Probeer asseblief weer.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl border-t border-border p-6">
          <BrutalistCard title="Skep beeld met AI" description="Beskryf die beeld wat jy wil skep.">
            <TextInput
              className="mt-4 rounded-xl border border-border bg-card px-4 py-3 font-normal text-base text-foreground"
              placeholder="Byvoorbeeld: \'n sononder in die Karoo met bergs op die agtergrond"
              placeholderTextColor="#8E8EA0"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
              editable={!isGenerating}
            />
            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-xl bg-accent px-6 py-3.5"
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-medium text-center text-base text-white">Skep</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl bg-card border border-border px-6 py-3.5"
                onPress={onClose}
                disabled={isGenerating}
              >
                <Text className="font-medium text-center text-base text-foreground">Kanselleer</Text>
              </TouchableOpacity>
            </View>
          </BrutalistCard>
        </View>
      </View>
    </Modal>
  );
}

