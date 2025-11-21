import { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { requestMediaLibraryPermission } from '@/lib/permissions';

import BrutalistCard from './BrutalistCard';
import { editImage } from '@/lib/openai';
import { uploadImageToSupabase } from '@/lib/storage';
import { track } from '@/lib/analytics';

const ACCENT = '#DE7356';
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

type ImageEditModalProps = {
  visible: boolean;
  onClose: () => void;
  onImageEdited: (imageUri: string, previewUri: string) => void;
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
  const [editedImageUri, setEditedImageUri] = useState<string | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setPrompt('');
      setStatusMessage('');
      setEditedImageUri(null);
      setPreviewImageUri(null);
      if (existingImageUri) {
        setSelectedImageUri(existingImageUri);
      }
    }
  }, [visible, existingImageUri]);

  const handlePickImage = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: IMAGE_MEDIA_TYPES,
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
    setStatusMessage('Wysig beeld met AI...');
    
    try {
      track('image_edit_started', {
        hasExistingImage: !!existingImageUri,
      });

      const editedImageUrl = await editImage(selectedImageUri, prompt, undefined, {
        thinkingLevel: 'low',
        mediaResolution: 'media_resolution_high',
      });
      
      if (editedImageUrl) {
        setStatusMessage('Laai beeld op...');
        const uploadedUrl = await uploadImageToSupabase(editedImageUrl, userId, messageId);
        const finalImageUri = uploadedUrl || editedImageUrl;
        
        // Show preview instead of immediately closing
        setEditedImageUri(finalImageUri);
        setPreviewImageUri(editedImageUrl); // Use local file as preview
        setStatusMessage('');
        setPrompt('');
        
        track('image_edit_preview_shown');
      } else {
        throw new Error('Geen beeld ontvang nie.');
      }
    } catch (error: any) {
      console.error('Beeld wysiging gefaal:', error);
      
      track('image_edit_error', {
        error: error?.message || 'Unknown error',
      });
      
      // More user-friendly error messages
      let errorMessage = 'Kon nie beeld wysig nie. Probeer asseblief weer.';
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
      setStatusMessage('');
    } finally {
      setIsEditing(false);
    }
  };

  const handleAccept = () => {
    if (editedImageUri && previewImageUri) {
      track('image_edit_accepted');
      onImageEdited(editedImageUri, previewImageUri);
      onClose();
    }
  };

  const handleRetry = () => {
    track('image_edit_retry');
    setEditedImageUri(null);
    setPreviewImageUri(null);
    setPrompt('');
  };

  const handleCancel = () => {
    track('image_edit_cancelled', {
      hasEditedImage: !!editedImageUri,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity 
          className="flex-1" 
          activeOpacity={1} 
          onPress={isEditing ? undefined : handleCancel}
        />
        <View className="bg-background rounded-t-3xl border-t border-border max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-border">
            <View className="flex-1">
              <Text className="font-heading font-semibold text-2xl text-foreground">
                Wysig beeld met AI
              </Text>
              <Text className="mt-1 font-normal text-sm text-muted">
                Kies 'n beeld en beskryf hoe jy dit wil wysig
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isEditing}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="#E8E2D6" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-6">
              {/* Original Image */}
              {selectedImageUri && !editedImageUri && (
                <View className="mb-4">
                  <Text className="mb-2 font-medium text-base text-foreground">
                    Oorspronklike beeld
                  </Text>
                  <View className="rounded-xl overflow-hidden border-2 border-border bg-card">
                    <Image 
                      source={{ uri: selectedImageUri }} 
                      className="w-full"
                      style={{ height: 200, maxHeight: 300 }}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}

              {/* Edited Image Preview */}
              {editedImageUri && previewImageUri ? (
                <View className="mb-4">
                  <Text className="mb-2 font-medium text-base text-foreground">
                    Gewysigde beeld
                  </Text>
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

              {/* Image Picker */}
              {!selectedImageUri && !editedImageUri && (
                <View className="mb-4">
                  <TouchableOpacity
                    className="rounded-xl border-2 border-dashed border-border bg-card px-6 py-12 items-center justify-center"
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="image-outline" size={48} color="#8E8EA0" />
                    <Text className="mt-3 font-medium text-base text-foreground">
                      Kies beeld om te wysig
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Prompt Input */}
              {!editedImageUri && (
                <View className="mb-4">
                  <Text className="mb-2 font-medium text-base text-foreground">
                    Jou wysiging beskrywing
                  </Text>
                  <TextInput
                    className="rounded-xl border-2 border-border bg-card px-4 py-4 font-normal text-base text-foreground min-h-[100px]"
                    placeholder="Byvoorbeeld: Voeg 'n sononder by"
                    placeholderTextColor="#8E8EA0"
                    value={prompt}
                    onChangeText={setPrompt}
                    multiline
                    textAlignVertical="top"
                    editable={!isEditing && selectedImageUri !== null}
                  />
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
              {!editedImageUri && (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={`flex-1 rounded-xl px-6 py-4 flex-row items-center justify-center gap-2 ${
                      isEditing || !selectedImageUri || !prompt.trim()
                        ? 'bg-accent/50'
                        : 'bg-accent'
                    }`}
                    onPress={handleEdit}
                    disabled={isEditing || !selectedImageUri || !prompt.trim()}
                    activeOpacity={0.8}
                  >
                    {isEditing ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text className="font-semibold text-center text-base text-white">
                          Wysig beeld...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="color-wand" size={20} color="#FFFFFF" />
                        <Text className="font-semibold text-center text-base text-white">
                          Wysig beeld
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="rounded-xl bg-card border-2 border-border px-6 py-4"
                    onPress={handleCancel}
                    disabled={isEditing}
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

