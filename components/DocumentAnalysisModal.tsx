import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { uploadDocumentToSupabase } from '@/lib/storage';
import { formatBytes, generateUUID } from '@/lib/utils';

const ACCENT = '#B46E3A';
const SUPPORTED_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'tsv', 'json'];
const MAX_CHARACTERS = 12000;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export type DocumentAnalysisPayload = {
  name: string;
  size?: number;
  mimeType?: string;
  content: string;
  truncated: boolean;
  fileUrl?: string | null;
};

type DocumentAnalysisModalProps = {
  visible: boolean;
  onClose: () => void;
  onAnalyze: (payload: DocumentAnalysisPayload) => Promise<void>;
  userId: string;
};

type PreparedDocument = DocumentAnalysisPayload & {
  preview: string;
};

export default function DocumentAnalysisModal({
  visible,
  onClose,
  onAnalyze,
  userId,
}: DocumentAnalysisModalProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [document, setDocument] = useState<PreparedDocument | null>(null);

  useEffect(() => {
    if (!visible) {
      setDocument(null);
      setStatusMessage('');
      setErrorMessage(null);
      setIsPicking(false);
      setIsAnalyzing(false);
    }
  }, [visible]);

  const handlePickDocument = async () => {
    try {
      setIsPicking(true);
      setErrorMessage(null);
      setStatusMessage('Kies \'n dokument...');

      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/json', 'text/csv', 'text/markdown'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setStatusMessage('');
        return;
      }

      const asset = Array.isArray(result.assets) ? result.assets[0] : (result as any);
      if (!asset?.uri) {
        throw new Error('Geen dokument URI beskikbaar nie.');
      }

      const { uri, name, size, mimeType } = asset;
      if (size && size > MAX_FILE_SIZE) {
        throw new Error('Hou dokumente onder 2MB vir vinnige analise.');
      }

      const extension = (name?.split('.').pop() || '').toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        throw new Error('Net teks, Markdown, CSV of JSON lêers word tans ondersteun.');
      }

      setStatusMessage('Lees inhoud...');
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!content || content.trim().length === 0) {
        throw new Error('Die dokument is leeg.');
      }

      if (content.includes('\u0000')) {
        throw new Error('Hierdie lêer lyk nie soos eenvoudige teks nie. Probeer \'n TXT of Markdown lêer.');
      }

      const truncated = content.length > MAX_CHARACTERS;
      const trimmedContent = truncated ? content.slice(0, MAX_CHARACTERS) : content;
      const preview = trimmedContent.slice(0, 600);

      setStatusMessage('Laai dokument op...');
      let fileUrl: string | null = null;
      try {
        fileUrl = await uploadDocumentToSupabase(
          uri,
          userId,
          generateUUID(),
          name,
          mimeType ?? 'text/plain',
        );
      } catch (uploadError) {
        console.warn('Kon nie dokument na Supabase oplaai nie:', uploadError);
      }

      setDocument({
        name: name ?? 'dokument.txt',
        size,
        mimeType,
        content: trimmedContent,
        truncated,
        fileUrl,
        preview,
      });

      setStatusMessage(truncated ? 'Gelaai (ingekort tot 12k karakters).' : 'Gelaai en gereed.');
    } catch (error: any) {
      console.error('Dokument kies fout:', error);
      setErrorMessage(error?.message ?? 'Kon nie dokument verwerk nie.');
      setDocument(null);
      setStatusMessage('');
    } finally {
      setIsPicking(false);
    }
  };

  const handleAnalyze = async () => {
    if (!document) {
      setErrorMessage('Kies eers \'n dokument om te analiseer.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setStatusMessage('Analiseer dokument...');
      await onAnalyze(document);
      setStatusMessage('Analise gestuur!');
      setDocument(null);
      setTimeout(() => {
        setStatusMessage('');
        onClose();
      }, 500);
    } catch (error: any) {
      console.error('Dokument analise fout:', error);
      setErrorMessage(error?.message ?? 'Kon nie dokument analiseer nie.');
      setStatusMessage('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderPreview = () => {
    if (!document) {
      return (
        <Text className="text-sm text-muted">
          Ondersteunde formate: TXT, Markdown, CSV en JSON. Gebruik dit vir notas, transkripsies,
          studies, bybelstudie vrae of projekplanne.
        </Text>
      );
    }

    return (
      <View className="rounded-2xl border border-border bg-card/60 p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="font-semibold text-base text-foreground" numberOfLines={1}>
              {document.name}
            </Text>
            <Text className="text-xs text-muted mt-0.5">
              {formatBytes(document.size)} • {document.mimeType || 'text'}
            </Text>
          </View>
          {document.truncated && (
            <View className="px-2 py-1 rounded-full bg-[#3B2B1C]">
              <Text className="text-[11px] font-semibold text-[#EBC28E]">Afgekort</Text>
            </View>
          )}
        </View>
        <View className="rounded-xl bg-[#171717] border border-border/60 px-3 py-3 max-h-[160px]">
          <ScrollView>
            <Text className="text-sm text-foreground/90 leading-relaxed">
              {document.preview}
              {document.truncated ? '\n...\n[Inhoud afgesny vir spoed]' : ''}
            </Text>
          </ScrollView>
        </View>
        {document.fileUrl ? (
          <Text className="text-xs text-muted mt-2">
            Publieke skakel gestoor vir latere verwysing.
          </Text>
        ) : (
          <Text className="text-xs text-muted mt-2">
            Kon nie \'n publieke skakel stoor nie, maar die teks is steeds beskikbaar vir analise.
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={isAnalyzing ? undefined : onClose} />
        <View className="bg-[#121212] rounded-t-3xl border-t border-border px-6 pt-6 pb-8 max-h-[85%]">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-semibold text-foreground">Laai dokument op</Text>
              <Text className="text-sm text-muted mt-1">
                Krijg vinnige opsommings en aksie-items uit notas, preke of verslae.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isAnalyzing} className="p-2">
              <Ionicons name="close" size={24} color="#E8E2D6" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <TouchableOpacity
                className="flex-row items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4"
                onPress={handlePickDocument}
                disabled={isPicking || isAnalyzing}
                activeOpacity={0.8}
              >
                <View className="w-12 h-12 rounded-2xl bg-card items-center justify-center">
                  {isPicking ? (
                    <ActivityIndicator color={ACCENT} />
                  ) : (
                    <Ionicons name="document-outline" size={28} color="#E8E2D6" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Kies \'n dokument
                  </Text>
                  <Text className="text-sm text-muted">
                    TXT, Markdown, CSV of JSON (max 2MB)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#666666" />
              </TouchableOpacity>

              {renderPreview()}

              {statusMessage ? (
                <View className="flex-row items-center gap-2 rounded-2xl border border-border/80 bg-card/50 px-4 py-3">
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text className="text-sm text-foreground flex-1">{statusMessage}</Text>
                </View>
              ) : null}

              {errorMessage ? (
                <View className="rounded-2xl border border-[#5D2C2C] bg-[#351919] px-4 py-3">
                  <Text className="text-sm text-[#F4B4B4]">{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                className={`rounded-2xl px-6 py-4 flex-row items-center justify-center gap-2 ${
                  !document || isAnalyzing ? 'bg-accent/50' : 'bg-accent'
                }`}
                onPress={handleAnalyze}
                disabled={!document || isAnalyzing}
                activeOpacity={0.85}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="font-semibold text-base text-white">Analiseer...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                    <Text className="font-semibold text-base text-white">Analiseer dokument</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text className="text-xs text-muted text-center">
                Jou dokument-inhoud word nie gestoor permanent nie — ons gebruik slegs die eerste 12k karakters
                om jou opsomming te skep.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

