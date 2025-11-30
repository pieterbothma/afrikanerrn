import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  FlatList,
  Image,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useUserStore } from "@/store/userStore";
import MenuDrawer from "@/components/MenuDrawer";
import { generateUUID, formatBytes } from "@/lib/utils";
import { answerQuestionAboutDocument } from "@/lib/openai";
import { uploadDocumentToSupabase } from "@/lib/storage";
import { track } from "@/lib/analytics";
import FloatingChatHeader from "@/components/FloatingChatHeader";
import AfricanLandscapeWatermark from "@/components/AfricanLandscapeWatermark";

// Neobrutalist Palette
const ACCENT = "#DE7356"; // Copper
const CHARCOAL = "#1A1A1A";
const SAND = "#E8E2D6";
const IVORY = "#F7F3EE";
const TEAL = "#3EC7E3";
const YELLOW = "#FFD800";
const BORDER = "#000000";
const LOGO = require("../../assets/branding/koedoelogo.png");

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/json",
  "text/csv",
  "text/markdown",
];

type DocumentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type LoadedDocument = {
  uri: string;
  localUri: string;
  name: string;
  mimeType?: string;
  size?: number;
  preview?: string;
  truncated?: boolean;
};

// Animated upload area with pulsing border
function DocumentUploadArea({
  onPress,
  isUploading,
}: {
  onPress: () => void;
  isUploading: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    float.start();

    return () => {
      pulse.stop();
      float.stop();
    };
  }, [pulseAnim, floatAnim]);

  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BORDER, ACCENT],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isUploading}
      activeOpacity={0.8}
    >
      <Animated.View
        className="rounded-2xl p-8 items-center justify-center min-h-[280px] relative overflow-hidden bg-ivory shadow-brutal"
        style={{
          borderWidth: 3,
          borderStyle: "dashed",
          borderColor,
        }}
      >
        {/* Icon with float animation */}
        <Animated.View
          className="w-24 h-24 rounded-2xl bg-copper border-2 border-borderBlack items-center justify-center mb-6"
          style={{
            transform: [{ translateY: floatAnim }],
          }}
        >
          {isUploading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <Ionicons name="document-text" size={48} color="#FFFFFF" />
          )}
        </Animated.View>

        <Text className="font-heading font-black text-2xl text-charcoal text-center mb-2">
          {isUploading ? "Laai op..." : "Laai jou dokument op"}
        </Text>
        <Text className="text-charcoal/80 font-medium text-base text-center mb-6 px-4">
          PDF, Word, TXT, Markdown, CSV of JSON
        </Text>

        {!isUploading && (
          <View className="bg-copper border-2 border-borderBlack rounded-xl px-6 py-3 shadow-sm">
            <View className="flex-row items-center gap-2">
              <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              <Text className="text-white font-bold text-base">
                Kies Dokument
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Document context card shown during chat
function DocumentContextCard({
  document,
  onClear,
}: {
  document: LoadedDocument;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="bg-white border-2 border-borderBlack rounded-xl overflow-hidden shadow-brutal-sm mb-4">
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        className="p-4 flex-row items-center"
        activeOpacity={0.7}
      >
        <View className="w-12 h-12 rounded-lg bg-copper border border-borderBlack items-center justify-center mr-3">
          <Ionicons name="document-text" size={24} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-base text-charcoal" numberOfLines={1}>
            {document.name}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            {document.size && (
              <Text className="text-xs text-charcoal/60 font-medium">
                {formatBytes(document.size)}
              </Text>
            )}
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
              <Text className="text-xs text-[#4ADE80] font-bold ml-1">
                Gereed
              </Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={onClear}
            className="w-8 h-8 rounded-full bg-charcoal border border-borderBlack items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
          <View className="w-8 h-8 rounded-full bg-ivory border border-borderBlack items-center justify-center">
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={CHARCOAL}
            />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && document.preview && (
        <View className="px-4 pb-4">
          <View className="rounded-lg bg-sand border border-borderBlack p-3 max-h-[120px]">
            <ScrollView>
              <Text className="text-xs text-charcoal leading-relaxed font-mono">
                {document.preview}
                {document.truncated && "\n...\n[Inhoud afgekort]"}
              </Text>
            </ScrollView>
          </View>
          {document.truncated && (
            <Text className="text-xs text-charcoal/60 font-medium mt-2">
              Die eerste deel van jou dokument word gebruik vir analise.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// Chat bubble component
function ChatBubble({ message }: { message: DocumentMessage }) {
  const isUser = message.role === "user";

  return (
    <View
      className={`flex-row ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      {!isUser && (
        <View className="w-8 h-8 rounded-lg bg-yellow border border-borderBlack items-center justify-center mr-2 mt-1">
          <Ionicons name="sparkles" size={16} color={CHARCOAL} />
        </View>
      )}
      <View
        className={`max-w-[85%] rounded-xl px-4 py-3 border-2 border-borderBlack ${
          isUser ? "bg-copper rounded-br-sm" : "bg-ivory rounded-bl-sm"
        }`}
      >
        <Text
          className={`text-base font-medium ${
            isUser ? "text-white" : "text-charcoal"
          }`}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

// Typing indicator
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -4,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View className="flex-row justify-start mb-4">
      <View className="w-8 h-8 rounded-lg bg-yellow border border-borderBlack items-center justify-center mr-2 mt-1">
        <Ionicons name="sparkles" size={16} color={CHARCOAL} />
      </View>
      <View className="bg-ivory border-2 border-borderBlack rounded-xl rounded-bl-sm px-5 py-4 flex-row items-center gap-1">
        <Animated.View
          className="w-2 h-2 rounded-full bg-charcoal"
          style={{ transform: [{ translateY: dot1 }] }}
        />
        <Animated.View
          className="w-2 h-2 rounded-full bg-charcoal"
          style={{ transform: [{ translateY: dot2 }] }}
        />
        <Animated.View
          className="w-2 h-2 rounded-full bg-charcoal"
          style={{ transform: [{ translateY: dot3 }] }}
        />
      </View>
    </View>
  );
}

// Suggested questions
function SuggestedQuestions({ onSelect }: { onSelect: (q: string) => void }) {
  const questions = [
    { text: "Gee my 'n opsomming", icon: "document-text" as const },
    { text: "Wat is die hoofpunte?", icon: "list" as const },
    { text: "Verduidelik in eenvoudige terme", icon: "bulb" as const },
    { text: "Wat is die gevolgtrekkings?", icon: "checkmark-circle" as const },
  ];

  return (
    <View className="mb-4">
      <Text className="text-xs text-charcoal font-bold uppercase tracking-wider mb-3 ml-1">
        Voorgestelde vrae
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {questions.map((q) => (
          <TouchableOpacity
            key={q.text}
            onPress={() => onSelect(q.text)}
            className="bg-ivory border-2 border-borderBlack rounded-lg px-3 py-2 flex-row items-center gap-2 shadow-brutal-sm"
            activeOpacity={0.7}
          >
            <Ionicons name={q.icon} size={14} color={ACCENT} />
            <Text className="text-sm text-charcoal font-bold">{q.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function DokumenteScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight ? useBottomTabBarHeight() : 0;
  const user = useUserStore((state) => state.user);

  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [document, setDocument] = useState<LoadedDocument | null>(null);
  const [messages, setMessages] = useState<DocumentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList<DocumentMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  // Scroll to end when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handlePickDocument = async () => {
    if (!user?.id) {
      Alert.alert(
        "Meld aan",
        "Jy moet aangemeld wees om dokumente op te laai."
      );
      return;
    }

    track("document_chat_upload_requested");
    setIsUploading(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_MIME_TYPES,
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsUploading(false);
        return;
      }

      const asset = result.assets[0];

      // Try to read preview for text files
      let preview: string | undefined;
      let truncated = false;
      const extension = (asset.name?.split(".").pop() || "").toLowerCase();
      const textExtensions = ["txt", "md", "markdown", "csv", "json"];

      if (
        textExtensions.includes(extension) &&
        asset.size &&
        asset.size < 2 * 1024 * 1024
      ) {
        try {
          const content = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          if (content && !content.includes("\u0000")) {
            truncated = content.length > 12000;
            preview = content.slice(0, 600);
          }
        } catch (e) {
          console.log("Could not generate preview:", e);
        }
      }

      // Upload to Supabase
      let uploadedUri = asset.uri;
      try {
        const url = await uploadDocumentToSupabase(
          asset.uri,
          user.id,
          generateUUID(),
          asset.name,
          asset.mimeType || "application/octet-stream"
        );
        if (url) uploadedUri = url;
      } catch (e) {
        console.log("Upload failed, using local URI:", e);
      }

      setDocument({
        uri: uploadedUri,
        localUri: asset.uri,
        name: asset.name ?? "dokument",
        mimeType: asset.mimeType,
        size: asset.size,
        preview,
        truncated,
      });

      // Clear previous messages when new document is loaded
      setMessages([]);

      track("document_chat_upload_completed");
    } catch (error: any) {
      console.error("Document pick error:", error);
      Alert.alert(
        "Oeps!",
        "Kon nie die dokument laai nie. Probeer asseblief weer."
      );
      track("document_chat_upload_failed", { error: error?.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async (promptOverride?: string) => {
    if (!user?.id || !document || isSending) return;

    const question = (promptOverride || input).trim();
    if (!question) return;

    track("document_chat_question_sent");
    setIsSending(true);
    setInput("");

    // Add user message
    const userMessage: DocumentMessage = {
      id: generateUUID(),
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const answer = await answerQuestionAboutDocument(
        document.localUri || document.uri,
        document.name,
        document.mimeType,
        question
      );

      const assistantMessage: DocumentMessage = {
        id: generateUUID(),
        role: "assistant",
        content: answer,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      track("document_chat_answer_received");
    } catch (error: any) {
      console.error("Document Q&A error:", error);
      const errorMessage: DocumentMessage = {
        id: generateUUID(),
        role: "assistant",
        content:
          "Oeps! Ek kon nie jou vraag beantwoord nie. Probeer asseblief weer.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      track("document_chat_error", { error: error?.message });
    } finally {
      setIsSending(false);
    }
  };

  const handleClearDocument = () => {
    Alert.alert("Verwyder dokument?", "Dit sal die huidige gesprek uitvee.", [
      { text: "Kanselleer", style: "cancel" },
      {
        text: "Verwyder",
        style: "destructive",
        onPress: () => {
          setDocument(null);
          setMessages([]);
          setInput("");
        },
      },
    ]);
  };

  const handleNewDocument = () => {
    if (messages.length > 0) {
      Alert.alert("Nuwe dokument?", "Dit sal die huidige gesprek uitvee.", [
        { text: "Kanselleer", style: "cancel" },
        {
          text: "Gaan voort",
          onPress: () => {
            setDocument(null);
            setMessages([]);
            setInput("");
            setTimeout(() => handlePickDocument(), 100);
          },
        },
      ]);
    } else {
      handlePickDocument();
    }
  };

  // Render upload screen when no document is loaded
  const renderUploadScreen = () => (
    <ScrollView
      className="flex-1 px-4"
      contentContainerStyle={{
        paddingTop: insets.top + 80,
        paddingBottom: 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View className="items-center mb-8">
        <Text className="font-heading font-black text-3xl text-charcoal text-center">
          Praat met jou Dokumente
        </Text>
        <Text className="text-charcoal font-medium text-base mt-2 text-center px-8">
          Laai 'n dokument op en vra vrae om opsommings, verduidelikings en
          insigte te kry.
        </Text>
      </View>

      {/* Upload Area */}
      <DocumentUploadArea
        onPress={handlePickDocument}
        isUploading={isUploading}
      />

      {/* Features */}
      <View className="mt-8">
        <Text className="font-bold text-xs text-charcoal uppercase tracking-wider mb-4 ml-1">
          Wat kan jy doen?
        </Text>
        <View className="gap-3">
          {[
            {
              icon: "document-text",
              title: "Opsommings",
              desc: "Kry 'n vinnige oorsig van jou dokument",
            },
            {
              icon: "help-circle",
              title: "Vra Vrae",
              desc: "Kry antwoorde oor spesifieke dele",
            },
            {
              icon: "bulb",
              title: "Verduidelikings",
              desc: "Verstaan komplekse konsepte maklik",
            },
            {
              icon: "list",
              title: "Hoofpunte",
              desc: "Identifiseer die belangrikste inligting",
            },
          ].map((feature) => (
            <View
              key={feature.title}
              className="bg-ivory border-2 border-borderBlack rounded-xl p-4 flex-row items-center gap-4 shadow-brutal-sm"
            >
              <View className="w-12 h-12 rounded-lg bg-yellow border border-borderBlack items-center justify-center">
                <Ionicons
                  name={feature.icon as any}
                  size={24}
                  color={CHARCOAL}
                />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-base text-charcoal">
                  {feature.title}
                </Text>
                <Text className="text-sm text-charcoal/80 mt-0.5 font-medium">
                  {feature.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  // Render chat screen when document is loaded
  const renderChatScreen = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? tabBarHeight : 0}
    >
      {/* Document Context */}
      <View className="px-4 pt-3 pb-2" style={{ paddingTop: insets.top + 80 }}>
        {document && (
          <DocumentContextCard
            document={document}
            onClear={handleClearDocument}
          />
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <View className="flex-1 pt-4">
            <SuggestedQuestions onSelect={(q) => handleSend(q)} />
            <View className="flex-1 items-center justify-center opacity-50 py-8">
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={48}
                color={CHARCOAL}
              />
              <Text className="text-charcoal text-sm mt-4 text-center font-medium">
                Vra enigiets oor jou dokument
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <ChatBubble message={item} />}
        ListFooterComponent={isSending ? <TypingIndicator /> : null}
      />

      {/* Input Bar */}
      <View
        className="border-t-3 border-borderBlack bg-sand px-4 py-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {messages.length > 0 && messages.length < 4 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
          >
            <View className="flex-row gap-2">
              {["Vertel my meer", "Verduidelik dit beter", "Wat nog?"].map(
                (q) => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => handleSend(q)}
                    disabled={isSending}
                    className="bg-white border border-borderBlack rounded-full px-4 py-2 shadow-sm"
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm text-charcoal font-bold">{q}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </ScrollView>
        )}

        <View className="flex-row items-end gap-3">
          <View className="flex-1 rounded-xl px-4 py-2.5 min-h-[44px] justify-center bg-white border-2 border-borderBlack">
            <TextInput
              ref={inputRef}
              className="font-medium text-base text-charcoal"
              placeholder="Vra oor jou dokument..."
              placeholderTextColor="#8E8EA0"
              value={input}
              onChangeText={setInput}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 20, maxHeight: 100, paddingVertical: 0 }}
            />
          </View>

          <TouchableOpacity
            className="rounded-full bg-copper w-11 h-11 items-center justify-center border-2 border-borderBlack shadow-brutal-sm"
            onPress={() => handleSend()}
            disabled={isSending || !input.trim()}
            style={{ opacity: isSending || !input.trim() ? 0.5 : 1 }}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <View className="flex-1 bg-background">
      <FloatingChatHeader
        onMenuPress={() => setShowMenuDrawer(true)}
        onNewChat={handleNewDocument}
        title="Dokumente"
        rightIcon="add"
        showRightIcon={!!document}
      />

      <AfricanLandscapeWatermark size={280} opacity={0.06} />

      {document ? renderChatScreen() : renderUploadScreen()}

      <MenuDrawer
        visible={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
      />
    </View>
  );
}
