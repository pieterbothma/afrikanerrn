import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export async function uploadImageToSupabase(
  localUri: string,
  userId: string,
  messageId: string,
): Promise<string | null> {
  try {
    const fileName = `${userId}/${messageId}-${Date.now()}.jpg`;
    
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      console.error('Lêer bestaan nie:', localUri);
      return null;
    }

    const response = await fetch(localUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage.from('chat-images').upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (error) {
      console.error('Kon nie beeld oplaai nie:', error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('chat-images').getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Beeld oplaai fout:', error);
    return null;
  }
}

