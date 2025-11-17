import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return true;
  }

  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (cameraStatus !== 'granted') {
    Alert.alert(
      'Kamera toestemming nodig',
      'Afrikaner.ai het toegang tot jou kamera nodig om fotos te maak. Gaan asseblief na instellings om toestemming te gee.',
      [
        { text: 'Kanselleer', style: 'cancel' },
        { text: 'Gaan na instellings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  return true;
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return true;
  }

  const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (mediaStatus !== 'granted') {
    Alert.alert(
      'Foto biblioteek toestemming nodig',
      'Afrikaner.ai het toegang tot jou foto biblioteek nodig om fotos te kies. Gaan asseblief na instellings om toestemming te gee.',
      [
        { text: 'Kanselleer', style: 'cancel' },
        { text: 'Gaan na instellings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  return true;
}

