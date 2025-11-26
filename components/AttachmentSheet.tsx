import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#1A1A1A'; // Charcoal for brutalist theme

export type AttachmentAction = 
  | 'camera'
  | 'gallery'
  | 'document'
  | 'create_image'
  | 'edit_image';

type AttachmentOption = {
  id: AttachmentAction;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  limitInfo?: string;
  disabled?: boolean;
};

type AttachmentSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: AttachmentAction) => void;
  usageInfo?: {
    imageGenerate?: { current: number; limit: number; remaining: number };
    imageEdit?: { current: number; limit: number; remaining: number };
  };
};

export default function AttachmentSheet({
  visible,
  onClose,
  onSelect,
  usageInfo,
}: AttachmentSheetProps) {
  const insets = useSafeAreaInsets();

  const options: AttachmentOption[] = [
    {
      id: 'camera',
      icon: 'camera-outline',
      title: 'Neem Foto',
      description: 'Maak \'n nuwe foto met jou kamera',
    },
    {
      id: 'gallery',
      icon: 'images-outline',
      title: 'Kies Foto',
      description: 'Kies \'n foto uit jou galery',
    },
    {
      id: 'document',
      icon: 'document-text-outline',
      title: 'Laai Dokument',
      description: 'PDF, Word, TXT of ander dokumente',
    },
    {
      id: 'create_image',
      icon: 'brush-outline',
      title: 'Skep Beeld met AI',
      description: 'Genereer \'n nuwe prent met kunsmatige intelligensie',
      limitInfo: usageInfo?.imageGenerate
        ? `${usageInfo.imageGenerate.remaining}/${usageInfo.imageGenerate.limit} oor vandag`
        : undefined,
    },
    {
      id: 'edit_image',
      icon: 'color-wand-outline',
      title: 'Redigeer Beeld',
      description: 'Wysig of verbeter \'n bestaande foto met AI',
      limitInfo: usageInfo?.imageEdit
        ? `${usageInfo.imageEdit.remaining}/${usageInfo.imageEdit.limit} oor vandag`
        : undefined,
    },
  ];

  const handleSelect = (action: AttachmentAction) => {
    onSelect(action);
    onClose();
  };

  const getIconBgColor = (id: AttachmentAction) => {
    switch(id) {
      case 'camera': return 'bg-yellow';
      case 'gallery': return 'bg-teal';
      case 'document': return 'bg-sand';
      case 'create_image': return 'bg-copper';
      case 'edit_image': return 'bg-white'; 
      default: return 'bg-sand';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <Pressable
          className="flex-1"
          onPress={onClose}
        />
        <View
          className="bg-ivory rounded-t-3xl border-t-4 border-borderBlack shadow-none"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-6 pb-6 border-b-3 border-borderBlack">
              <View className="flex-1">
                <Text className="font-black text-3xl text-charcoal">
                  Voeg by
                </Text>
                <Text className="mt-1 font-bold text-base text-charcoal">
                  Kies hoe jy media wil byvoeg
                </Text>
              </View>
              <Pressable 
                onPress={onClose} 
                className="p-2 bg-white border-2 border-borderBlack rounded-full shadow-brutal-sm active:translate-y-[2px] active:shadow-none"
              >
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </Pressable>
            </View>

            {/* Options */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 20 }}
              style={{ maxHeight: 500 }}
            >
              <View className="px-6 gap-4">
                {options.map((option) => (
                  <Pressable
                    key={option.id}
                    className={`rounded-xl border-3 border-borderBlack p-4 flex-row items-center gap-4 ${
                      option.disabled
                        ? 'bg-gray-200 opacity-50'
                        : 'bg-white shadow-brutal active:translate-y-[2px] active:shadow-none'
                    }`}
                    onPress={() => !option.disabled && handleSelect(option.id)}
                    disabled={option.disabled}
                  >
                    <View
                      className={`w-14 h-14 rounded-lg border-2 border-borderBlack items-center justify-center ${
                        option.disabled
                          ? 'bg-gray-300'
                          : getIconBgColor(option.id)
                      }`}
                    >
                      <Ionicons
                        name={option.icon}
                        size={28}
                        color={option.disabled ? '#666666' : ACCENT}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-black text-lg ${
                          option.disabled ? 'text-gray-500' : 'text-charcoal'
                        }`}
                      >
                        {option.title}
                      </Text>
                      <Text className="text-sm font-medium text-charcoal mt-0.5">
                        {option.description}
                      </Text>
                      {option.limitInfo && (
                        <Text className="text-xs text-copper mt-1 font-bold">
                          {option.limitInfo}
                        </Text>
                      )}
                    </View>
                    {!option.disabled && (
                      <Ionicons
                        name="chevron-forward"
                        size={24}
                        color="#1A1A1A"
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
      </View>
    </Modal>
  );
}
