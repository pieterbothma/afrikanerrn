import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '@/store/userStore';
import MenuDrawer from '@/components/MenuDrawer';
import FloatingChatHeader from '@/components/FloatingChatHeader';
import AfricanLandscapeWatermark from '@/components/AfricanLandscapeWatermark';

// Neobrutalist Palette
const ACCENT = '#DE7356'; // Copper
const CHARCOAL = '#1A1A1A';
const SAND = '#E8E2D6';
const IVORY = '#F7F3EE';
const YELLOW = '#FFD800';
const TEAL = '#3EC7E3';
const BORDER = '#000000';
const LOGO = require('../../assets/branding/koedoelogo.png');

const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

// Animated upload area with pulsing border
function UploadArea({
  onPress,
  hasImage,
  imageUri,
  onClear,
  label,
  isRequired = false,
  size = 'half',
}: {
  onPress: () => void;
  hasImage: boolean;
  imageUri: string | null;
  onClear: () => void;
  label: string;
  isRequired?: boolean;
  size?: 'half' | 'full';
}) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasImage) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [hasImage, pulseAnim]);

  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BORDER, ACCENT],
  });

  const heightClass = size === 'full' ? 'h-48' : 'h-40';

  if (hasImage && imageUri) {
    return (
      <View className={`${size === 'half' ? 'flex-1' : 'w-full'} ${heightClass} rounded-xl overflow-hidden relative border-2 border-borderBlack bg-white`}>
        <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode={size === 'full' ? 'contain' : 'cover'} />
        <TouchableOpacity
          onPress={onClear}
          className="absolute top-2 right-2 w-8 h-8 bg-charcoal border border-borderBlack rounded-full items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={18} color="white" />
        </TouchableOpacity>
        <View className="absolute bottom-0 left-0 right-0 bg-charcoal border-t-2 border-borderBlack p-2 flex-row items-center gap-1 justify-center">
          <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
          <Text className="text-white text-xs font-bold">Gereed</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`${size === 'half' ? 'flex-1' : 'w-full'}`}
    >
      <Animated.View
        className={`${heightClass} bg-ivory rounded-xl items-center justify-center overflow-hidden shadow-brutal-sm`}
        style={{
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor,
        }}
      >
        <View className="w-12 h-12 rounded-lg bg-yellow border-2 border-borderBlack items-center justify-center mb-3">
          <Ionicons name="cloud-upload-outline" size={24} color={CHARCOAL} />
        </View>
        <Text className="text-charcoal font-bold text-sm">{label}</Text>
        {isRequired && (
          <Text className="text-accent font-bold text-xs mt-1">Verpligtend</Text>
        )}
        {!isRequired && (
          <Text className="text-charcoal/60 text-xs mt-1 font-medium">Opsioneel</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Progress overlay during generation
function GeneratingOverlay({ mode }: { mode: 'create' | 'edit' }) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="absolute inset-0 bg-sand/95 items-center justify-center z-50">
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="sparkles" size={64} color={ACCENT} />
      </Animated.View>
      <Text className="font-heading font-black text-2xl text-charcoal mt-6 text-center">
        {mode === 'create' ? 'Skep jou kuns...' : 'Redigeer jou foto...'}
      </Text>
      <Text className="text-charcoal font-medium text-base mt-2">Dit kan 'n paar sekondes neem</Text>
    </View>
  );
}

type GeneratedImage = {
  id: string;
  uri: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
};

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
type Resolution = '1K' | '2K'; // 4K excluded for speed/cost unless requested

export default function FotosScreen() {
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  
  // Navigation State
  const [viewMode, setViewMode] = useState<'menu' | 'create' | 'edit'>('menu');
  
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [secondImage, setSecondImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [showSettings, setShowSettings] = useState(false);

  const handleGenerate = async () => {
    if (!user?.id) {
      Alert.alert('Meld aan', 'Jy moet aangemeld wees om prente te skep.');
      return;
    }
    
    if (!prompt.trim()) {
      Alert.alert('Invoer vereis', 'Beskryf asseblief die prent wat jy wil skep.');
      return;
    }

    setIsGenerating(true);
    try {
       // Check limits
       const usageCheck = await checkUsageLimit(user.id, 'image_generate');
       if (!usageCheck.allowed) {
         Alert.alert('Limiet bereik', 'Jy het jou daglimiet bereik.');
         setIsGenerating(false);
         return;
       }

       const referenceImages: string[] = [];
       if (selectedImage) referenceImages.push(selectedImage);
       if (secondImage) referenceImages.push(secondImage);

       // Call Gemini API
       const generatedUri = await generateImage(prompt, {
         aspectRatio: aspectRatio,
         imageSize: resolution,
         referenceImages: referenceImages,
       });

       if (!generatedUri) {
         throw new Error('Geen beeld ontvang nie.');
       }
       
       // Log usage
       await logUsage(user.id, 'image_generate');
       track('image_generation_completed', { aspectRatio, resolution });

       // Upload result to Supabase for persistence
       const permanentUrl = await uploadImageToSupabase(generatedUri, user.id, generateUUID());

       const newImage: GeneratedImage = {
         id: generateUUID(),
         uri: permanentUrl || generatedUri,
         prompt: prompt,
         aspectRatio,
         resolution
       };
       
       setGeneratedImages([newImage, ...generatedImages]);
       setPrompt('');
       // Don't clear selected images automatically for iterate
       // setSelectedImage(null);
       // setSecondImage(null);

    } catch (error: any) {
      console.error(error);
      Alert.alert('Fout', error?.message || 'Kon nie prent genereer nie.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!user?.id) {
      Alert.alert('Meld aan', 'Jy moet aangemeld wees om prente te redigeer.');
      return;
    }
    
    if (!selectedImage) {
      Alert.alert('Foto vereis', 'Kies asseblief \'n foto om te redigeer.');
      return;
    }

    if (!prompt.trim()) {
      Alert.alert('Invoer vereis', 'Beskryf asseblief hoe jy die foto wil verander.');
      return;
    }

    setIsGenerating(true);
    try {
       // Check limits
       const usageCheck = await checkUsageLimit(user.id, 'image_edit');
       if (!usageCheck.allowed) {
         Alert.alert('Limiet bereik', 'Jy het jou daglimiet bereik vir redigering.');
         setIsGenerating(false);
         return;
       }

       // Call Gemini API (editImage)
       const editedUri = await editImage(selectedImage, prompt, undefined, {
         mediaResolution: 'media_resolution_high',
       });

       if (!editedUri) {
         throw new Error('Geen beeld ontvang nie.');
       }
       
       // Log usage
       await logUsage(user.id, 'image_edit');
       track('image_edit_completed', {});

       const permanentUrl = await uploadImageToSupabase(editedUri, user.id, generateUUID());

       const newImage: GeneratedImage = {
         id: generateUUID(),
         uri: permanentUrl || editedUri,
         prompt: prompt,
         aspectRatio: 'Original',
         resolution: 'High'
       };
       
       setGeneratedImages([newImage, ...generatedImages]);
       setPrompt('');
       setSelectedImage(null); // Clear for next edit

    } catch (error: any) {
      console.error(error);
      Alert.alert('Fout', error?.message || 'Kon nie prent redigeer nie.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePickImage = async (isSecond = false) => {
     const hasPermission = await requestMediaLibraryPermission();
     if (!hasPermission) return;

     const result = await ImagePicker.launchImageLibraryAsync({
       mediaTypes: IMAGE_MEDIA_TYPES,
       quality: 0.8,
       allowsEditing: true,
     });

     if (!result.canceled && result.assets[0]) {
       if (isSecond) {
         setSecondImage(result.assets[0].uri);
       } else {
         setSelectedImage(result.assets[0].uri);
       }
     }
  };

  // Reset state when leaving a mode
  const handleBackToMenu = () => {
    setViewMode('menu');
    setPrompt('');
    setSelectedImage(null);
    setSecondImage(null);
  };

  const renderMenu = () => (
    <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 80 }}>
      
      {/* Hero Section - Koedoe Fotolab */}
      <View
        className="rounded-2xl p-6 border-3 border-borderBlack mb-6 bg-teal shadow-brutal"
      >
        <View className="items-center">
          <View className="w-12 h-12 items-center justify-center mb-2">
            <Image source={LOGO} style={{ height: 40, width: 40, resizeMode: 'contain' }} />
          </View>
          <Text className="font-heading font-black text-2xl text-charcoal text-center">Koedoe Fotolab</Text>
          <Text className="text-charcoal font-medium text-sm mt-2 text-center">Maak nuwe foto's of wysig 'n bestaande een.</Text>
        </View>
      </View>
      
      <View className="gap-4">
        {/* Create Option */}
        <TouchableOpacity
          onPress={() => setViewMode('create')}
          className="bg-white border-3 border-borderBlack rounded-2xl p-5 flex-row items-center gap-4 shadow-brutal-sm"
          activeOpacity={0.7}
        >
          <View className="w-12 h-12 rounded-full bg-yellow border-2 border-borderBlack items-center justify-center">
            <Ionicons name="color-palette" size={24} color={CHARCOAL} />
          </View>
          <View className="flex-1">
            <Text className="font-heading font-bold text-lg text-charcoal">Maak 'n Nuwe Foto</Text>
            <Text className="text-charcoal/80 font-medium text-sm mt-0.5">Skep iets heeltemal nuut.</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={CHARCOAL} />
        </TouchableOpacity>

        {/* Edit Option */}
        <TouchableOpacity
          onPress={() => setViewMode('edit')}
          className="bg-white border-3 border-borderBlack rounded-2xl p-5 flex-row items-center gap-4 shadow-brutal-sm"
          activeOpacity={0.7}
        >
          <View className="w-12 h-12 rounded-full bg-yellow border-2 border-borderBlack items-center justify-center">
            <Ionicons name="pencil" size={24} color={CHARCOAL} />
          </View>
          <View className="flex-1">
            <Text className="font-heading font-bold text-lg text-charcoal">Wysig 'n Foto</Text>
            <Text className="text-charcoal/80 font-medium text-sm mt-0.5">Verander 'n foto wat jy reeds het</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={CHARCOAL} />
        </TouchableOpacity>
      </View>

      {/* Recent History Preview */}
      {generatedImages.length > 0 && (
        <View className="mt-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-bold text-xs text-charcoal uppercase tracking-wider">Onlangse Kuns</Text>
            <Text className="text-xs font-bold text-copper">{generatedImages.length} items</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {generatedImages.slice(0, 4).map((img) => (
              <TouchableOpacity 
                key={img.id} 
                className="w-[47%] aspect-square rounded-xl overflow-hidden bg-white border-2 border-borderBlack relative shadow-brutal-sm"
                onPress={() => {
                  Alert.alert('Opsies', img.prompt, [
                    { text: 'Maak toe', style: 'cancel' },
                    { text: 'Gebruik as basis', onPress: () => {
                      setSelectedImage(img.uri);
                      setPrompt(img.prompt);
                      setViewMode('create');
                    }}
                  ])
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />
                <View
                  className="absolute bottom-0 left-0 right-0 p-2 bg-charcoal border-t-2 border-borderBlack"
                >
                  <Text className="text-white text-xs font-bold" numberOfLines={1}>{img.prompt}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderGenerationScreen = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 80 }}>
        
        {/* Settings Area (Collapsible) - Only for Create Mode */}
        {viewMode === 'create' && showSettings && (
            <View className="bg-ivory border-2 border-borderBlack rounded-xl p-4 mb-4 gap-4 shadow-brutal-sm">
              <View>
                <Text className="text-charcoal font-bold text-xs uppercase mb-2">Aspekverhouding</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as AspectRatio[]).map((ar) => (
                    <TouchableOpacity
                      key={ar}
                      onPress={() => setAspectRatio(ar)}
                      className={`px-3 py-1.5 rounded-lg border-2 ${
                        aspectRatio === ar 
                          ? 'bg-copper border-borderBlack' 
                          : 'bg-white border-borderBlack'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${aspectRatio === ar ? 'text-white' : 'text-charcoal'}`}>
                        {ar}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text className="text-charcoal font-bold text-xs uppercase mb-2">Resolusie</Text>
                <View className="flex-row gap-2">
                  {(['1K', '2K'] as Resolution[]).map((res) => (
                    <TouchableOpacity
                      key={res}
                      onPress={() => setResolution(res)}
                      className={`px-3 py-1.5 rounded-lg border-2 ${
                        resolution === res 
                          ? 'bg-copper border-borderBlack' 
                          : 'bg-white border-borderBlack'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${resolution === res ? 'text-white' : 'text-charcoal'}`}>
                        {res}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
        )}

        {/* Prompt Input Area */}
        <View className="bg-ivory border-2 border-borderBlack rounded-xl p-4 mb-4 shadow-brutal-sm">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-charcoal font-bold text-xs uppercase">
              {viewMode === 'create' ? 'Prompt' : 'Redigering Instruksie'}
            </Text>
            <TouchableOpacity onPress={() => setPrompt('')}>
              <Ionicons name="trash-outline" size={18} color={CHARCOAL} />
            </TouchableOpacity>
          </View>
          <TextInput
            className="text-charcoal font-medium text-base min-h-[100px]"
            placeholder={viewMode === 'create' ? "Beskryf jou prentjie..." : "Beskryf hoe jy die foto wil verander..."}
            placeholderTextColor="#8E8EA0"
            multiline
            value={prompt}
            onChangeText={setPrompt}
            textAlignVertical="top"
          />
        </View>

        {/* Image Upload Section */}
        <Text className="font-bold text-xs text-charcoal uppercase tracking-wider mb-3 ml-1">
          {viewMode === 'create' ? 'Verwysingsbeelde (Opsioneel)' : 'Kies jou foto'}
        </Text>
        
        <View className="flex-row gap-3 mb-6">
          {viewMode === 'create' ? (
            <>
              <UploadArea
                onPress={() => handlePickImage(false)}
                hasImage={!!selectedImage}
                imageUri={selectedImage}
                onClear={() => setSelectedImage(null)}
                label="Eerste Foto"
                size="half"
              />
              <UploadArea
                onPress={() => handlePickImage(true)}
                hasImage={!!secondImage}
                imageUri={secondImage}
                onClear={() => setSecondImage(null)}
                label="Tweede Foto"
                size="half"
              />
            </>
          ) : (
            <UploadArea
              onPress={() => handlePickImage(false)}
              hasImage={!!selectedImage}
              imageUri={selectedImage}
              onClear={() => setSelectedImage(null)}
              label="Kies foto om te redigeer"
              isRequired
              size="full"
            />
          )}
        </View>

        {/* Generate/Edit Button */}
        <TouchableOpacity
          onPress={viewMode === 'create' ? handleGenerate : handleEdit}
          disabled={isGenerating || (viewMode === 'edit' && !selectedImage)}
          className="w-full py-4 rounded-xl items-center justify-center mb-8 border-2 border-borderBlack"
          activeOpacity={0.8}
          style={{
            backgroundColor: isGenerating || (viewMode === 'edit' && !selectedImage) ? '#8E8EA0' : ACCENT,
            shadowColor: '#000',
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons 
              name={viewMode === 'create' ? 'sparkles' : 'color-wand'} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text className="text-white font-black text-lg">
              {viewMode === 'create' ? 'Genereer Kuns' : 'Redigeer Foto'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* History / Results */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="font-bold text-xs text-charcoal uppercase tracking-wider">Geskiedenis</Text>
          {generatedImages.length > 0 && (
            <Text className="text-xs font-bold text-copper">{generatedImages.length} items</Text>
          )}
        </View>
        
        {generatedImages.length === 0 ? (
          <View className="items-center justify-center py-16 border-2 border-dashed border-borderBlack rounded-2xl bg-ivory">
            <View className="w-16 h-16 rounded-full bg-white border-2 border-borderBlack items-center justify-center mb-4">
              <Ionicons name="images-outline" size={32} color={CHARCOAL} />
            </View>
            <Text className="font-bold text-base text-charcoal">Nog geen kuns nie</Text>
            <Text className="text-sm text-charcoal/60 font-medium mt-1">Jou skeppings sal hier verskyn</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {generatedImages.map((img) => (
              <TouchableOpacity 
                key={img.id} 
                className="w-[47%] aspect-square rounded-xl overflow-hidden bg-white border-2 border-borderBlack relative shadow-brutal-sm"
                onPress={() => {
                  Alert.alert(
                    'Opsies',
                    img.prompt,
                    [
                      { text: 'Maak toe', style: 'cancel' },
                      { text: 'Gebruik as basis', onPress: () => {
                        setSelectedImage(img.uri);
                        setPrompt(img.prompt);
                      }}
                    ]
                  )
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />
                <View
                  className="absolute bottom-0 left-0 right-0 p-2 bg-charcoal border-t-2 border-borderBlack"
                >
                  <Text className="text-white text-xs font-bold" numberOfLines={1}>{img.prompt}</Text>
                  <Text className="text-white/60 text-[10px] mt-0.5 font-medium">{img.resolution} • {img.aspectRatio}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View className="flex-1 bg-background">
      {/* Floating Header */}
      <FloatingChatHeader
        onMenuPress={viewMode === 'menu' ? () => setShowMenuDrawer(true) : handleBackToMenu}
        onNewChat={viewMode === 'menu' ? () => {} : () => setShowSettings(!showSettings)}
        title="Fotos"
        showRightIcon={viewMode !== 'menu' && viewMode === 'create'}
        rightIcon={showSettings ? 'options' : 'options-outline'}
      />
      
      <AfricanLandscapeWatermark size={280} opacity={0.06} />

      {viewMode === 'menu' ? renderMenu() : renderGenerationScreen()}

      {/* Generating Overlay */}
      {isGenerating && <GeneratingOverlay mode={viewMode === 'edit' ? 'edit' : 'create'} />}

      <MenuDrawer visible={showMenuDrawer} onClose={() => setShowMenuDrawer(false)} />
    </View>
  );
}
