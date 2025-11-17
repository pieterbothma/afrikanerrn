import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type InputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onTakePhoto?: () => void;
  onEditPhoto?: () => void;
  onAddFiles?: () => void;
  onCreateImage?: () => void;
  isSending?: boolean;
};

export default function InputBar({
  value,
  onChangeText,
  onSend,
  onTakePhoto,
  onEditPhoto,
  onAddFiles,
  onCreateImage,
  isSending = false,
}: InputBarProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSend = () => {
    if (value.trim().length === 0 || isSending) {
      return;
    }

    onSend();
  };

  const handleWithClose = (callback: () => void) => {
    setIsMenuVisible(false);
    callback();
  };

  return (
    <>
      <View
        className="border-t border-border bg-background px-4 py-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-end gap-3">
          <TouchableOpacity
            className="rounded-full bg-card w-11 h-11 items-center justify-center mb-0.5"
            onPress={() => setIsMenuVisible(true)}
            accessibilityLabel="Voeg by"
            activeOpacity={0.6}
          >
            <Text className="font-semibold text-2xl text-foreground leading-none">+</Text>
          </TouchableOpacity>

          <View className="flex-1 rounded-2xl bg-background border border-border px-4 py-2.5 min-h-[44px] justify-center">
            <TextInput
              className="font-normal text-base text-foreground"
              placeholder="Tik jou boodskap…"
              placeholderTextColor="#8E8EA0"
              value={value}
              onChangeText={onChangeText}
              multiline
              textAlignVertical="top"
              autoCorrect
              autoCapitalize="sentences"
              style={{ minHeight: 20, maxHeight: 100, paddingVertical: 0 }}
            />
          </View>

          <TouchableOpacity
            className="rounded-full bg-accent w-11 h-11 items-center justify-center mb-0.5"
            onPress={handleSend}
            disabled={isSending || value.trim().length === 0}
            accessibilityLabel="Stuur boodskap"
            activeOpacity={0.8}
            style={{ opacity: value.trim().length === 0 ? 0.5 : 1 }}
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="font-semibold text-xl text-white leading-none">→</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal animationType="fade" transparent visible={isMenuVisible} onRequestClose={() => setIsMenuVisible(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setIsMenuVisible(false)}>
          <View
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-background border-t border-border px-6 py-6"
            style={{
              paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 24) : 24,
            }}
          >
            <Text className="font-semibold text-xl text-foreground">Afrikaner.ai gereedskap</Text>
            <Text className="mt-1.5 font-normal text-sm text-muted">
              Voeg vinnig media by of begin kreatiewe projekte.
            </Text>

            <View className="mt-5 space-y-2.5">
              {onTakePhoto && (
                <TouchableOpacity
                  className="rounded-xl bg-card border border-border px-5 py-4"
                  onPress={() => handleWithClose(onTakePhoto)}
                >
                  <Text className="font-medium text-base text-foreground">Maak Foto</Text>
                </TouchableOpacity>
              )}

              {onEditPhoto && (
                <TouchableOpacity
                  className="rounded-xl bg-card border border-border px-5 py-4"
                  onPress={() => handleWithClose(onEditPhoto)}
                >
                  <Text className="font-medium text-base text-foreground">Redigeer Foto (laai foto op)</Text>
                </TouchableOpacity>
              )}

              {onAddFiles && (
                <TouchableOpacity
                  className="rounded-xl bg-card border border-border px-5 py-4"
                  onPress={() => handleWithClose(onAddFiles)}
                >
                  <Text className="font-medium text-base text-foreground">Add Files (Analiseer & som op)</Text>
                </TouchableOpacity>
              )}

              {onCreateImage && (
                <TouchableOpacity
                  className="rounded-xl bg-card border border-border px-5 py-4"
                  onPress={() => handleWithClose(onCreateImage)}
                >
                  <Text className="font-medium text-base text-foreground">Skep beeld met AI</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

