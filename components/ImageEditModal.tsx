import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestMediaLibraryPermission } from '@/lib/permissions';

import BrutalistCard from './BrutalistCard';
import { editImage } from '@/lib/openai';
import { uploadImageToSupabase } from '@/lib/storage';

const ACCENT = '#DE7356';

type ImageEditModalProps = {
  visible: boolean;
  onClose: () => void;
  onImageEdited: (imageUrl: string) => void;
  userId: string;
  messageId: string;
  existingImageUri?: string;
};

export default function ImageEditModal({
  visible,
  onClose,
  onImageEdited,
  userId,
  messageId,
  existingImageUri,
}: ImageEditModalProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(existingImageUri || null);
  const [isEditing, setIsEditing] = useState(false);

  const handlePickImage = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Kon nie beeld kies nie:', error);
      Alert.alert('Oeps!', 'Kon nie die beeld laai nie.');
    }
  };

  const handleEdit = async () => {
    if (!selectedImageUri) {
      Alert.alert('Oeps!', 'Kies asseblief \'n beeld om te wysig.');
      return;
    }

    if (!prompt.trim()) {
      Alert.alert('Oeps!', 'Voer asseblief \'n beskrywing in vir die wysiging.');
      return;
    }

    setIsEditing(true);
    try {
      const editedImageUrl = await editImage(selectedImageUri, prompt);
      if (editedImageUrl) {
        const uploadedUrl = await uploadImageToSupabase(editedImageUrl, userId, messageId);
        onImageEdited(uploadedUrl || editedImageUrl);
        setPrompt('');
        setSelectedImageUri(null);
        onClose();
      } else {
        Alert.alert('Oeps!', 'Kon nie beeld wysig nie. Probeer asseblief weer.');
      }
    } catch (error) {
      console.error('Beeld wysiging gefaal:', error);
      Alert.alert('Oeps!', 'Kon nie beeld wysig nie. Probeer asseblief weer.');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl border-t border-border p-6">
          <BrutalistCard title="Wysig bestaande beeld" description="Kies \'n beeld en beskryf hoe jy dit wil wysig.">
            {selectedImageUri ? (
              <Image source={{ uri: selectedImageUri }} className="mt-4 h-40 w-full rounded-lg" />
            ) : (
              <TouchableOpacity
                className="mt-4 rounded-xl border border-border bg-card px-6 py-8"
                onPress={handlePickImage}
              >
                <Text className="font-medium text-center text-base text-foreground">Kies beeld</Text>
              </TouchableOpacity>
            )}
            <TextInput
              className="mt-4 rounded-xl border border-border bg-card px-4 py-3 font-normal text-base text-foreground"
              placeholder="Byvoorbeeld: Voeg \'n sononder by"
              placeholderTextColor="#8E8EA0"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={3}
              editable={!isEditing}
            />
            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-xl bg-accent px-6 py-3.5"
                onPress={handleEdit}
                disabled={isEditing || !selectedImageUri}
              >
                {isEditing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-medium text-center text-base text-white">Wysig</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl bg-card border border-border px-6 py-3.5"
                onPress={onClose}
                disabled={isEditing}
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

