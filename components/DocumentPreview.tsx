import { View, Text, ScrollView } from 'react-native';
import { formatBytes } from '@/lib/utils';

type DocumentPreviewProps = {
  name: string;
  size?: number;
  mimeType?: string;
  preview?: string;
  truncated?: boolean;
  fileUrl?: string | null;
  compact?: boolean;
};

export default function DocumentPreview({
  name,
  size,
  mimeType,
  preview,
  truncated,
  fileUrl,
  compact = false,
}: DocumentPreviewProps) {
  if (compact) {
    return (
      <View className="rounded-xl border border-border bg-card/60 p-3">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="font-semibold text-sm text-foreground" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-xs text-muted mt-0.5">
              {size ? formatBytes(size) : ''} • {mimeType || 'text'}
            </Text>
          </View>
          {truncated && (
            <View className="px-2 py-1 rounded-full bg-[#3B2B1C] ml-2">
              <Text className="text-[11px] font-semibold text-[#EBC28E]">Afgekort</Text>
            </View>
          )}
        </View>
        {preview && (
          <View className="rounded-lg bg-[#171717] border border-border/60 px-2 py-2 max-h-[80px] mt-2">
            <ScrollView>
              <Text className="text-xs text-foreground/90 leading-relaxed">
                {preview}
                {truncated ? '\n...\n[Inhoud afgesny vir spoed]' : ''}
              </Text>
            </ScrollView>
          </View>
        )}
        {truncated && (
          <Text className="text-xs text-muted mt-2">
            Net die eerste 12k karakters sal geanaliseer word.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-border bg-card/60 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="font-semibold text-base text-foreground" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-xs text-muted mt-0.5">
            {size ? formatBytes(size) : ''} • {mimeType || 'text'}
          </Text>
        </View>
        {truncated && (
          <View className="px-2 py-1 rounded-full bg-[#3B2B1C]">
            <Text className="text-[11px] font-semibold text-[#EBC28E]">Afgekort</Text>
          </View>
        )}
      </View>
      {preview && (
        <View className="rounded-xl bg-[#171717] border border-border/60 px-3 py-3 max-h-[160px]">
          <ScrollView>
            <Text className="text-sm text-foreground/90 leading-relaxed">
              {preview}
              {truncated ? '\n...\n[Inhoud afgesny vir spoed]' : ''}
            </Text>
          </ScrollView>
        </View>
      )}
      {fileUrl ? (
        <Text className="text-xs text-muted mt-2">
          Publieke skakel gestoor vir latere verwysing.
        </Text>
      ) : truncated ? (
        <Text className="text-xs text-muted mt-2">
          Net die eerste 12k karakters sal geanaliseer word.
        </Text>
      ) : null}
    </View>
  );
}

