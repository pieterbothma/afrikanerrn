import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return true;
  }

  // First check current permission status
  const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
  console.log('[Permissions] Current camera permission status:', currentStatus);
  
  // If already granted, return true
  if (currentStatus === 'granted') {
    console.log('[Permissions] Camera permission already granted');
    return true;
  }
  
  // If denied, show alert to go to settings
  if (currentStatus === 'denied') {
    console.log('[Permissions] Camera permission denied, directing to settings');
    Alert.alert(
      'Kamera toestemming nodig',
      'Koedoe het toegang tot jou kamera nodig om fotos te maak. Gaan asseblief na instellings om toestemming te gee.',
      [
        { text: 'Kanselleer', style: 'cancel' },
        { text: 'Gaan na instellings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // If undetermined, request permission (this will show the dialog)
  console.log('[Permissions] Requesting camera permission (status was undetermined)');
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
  console.log('[Permissions] Camera permission request result:', cameraStatus);
  
  if (cameraStatus !== 'granted') {
    Alert.alert(
      'Kamera toestemming nodig',
      'Koedoe het toegang tot jou kamera nodig om fotos te maak. Gaan asseblief na instellings om toestemming te gee.',
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

  // First check current permission status
  const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
  
  // If already granted, return true
  if (currentStatus === 'granted') {
    return true;
  }
  
  // If denied, show alert to go to settings
  if (currentStatus === 'denied') {
    Alert.alert(
      'Foto biblioteek toestemming nodig',
      'Koedoe het toegang tot jou foto biblioteek nodig om fotos te kies. Gaan asseblief na instellings om toestemming te gee.',
      [
        { text: 'Kanselleer', style: 'cancel' },
        { text: 'Gaan na instellings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // If undetermined, request permission (this will show the dialog)
  const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (mediaStatus !== 'granted') {
    Alert.alert(
      'Foto biblioteek toestemming nodig',
      'Koedoe het toegang tot jou foto biblioteek nodig om fotos te kies. Gaan asseblief na instellings om toestemming te gee.',
      [
        { text: 'Kanselleer', style: 'cancel' },
        { text: 'Gaan na instellings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  return true;
}





