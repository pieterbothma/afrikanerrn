import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/userStore';

// Colors
const CHARCOAL = '#1A1A1A';
const YELLOW = '#FFD800';
const COPPER = '#DE7356';
const TEAL = '#3EC7E3';
const IVORY = '#F7F3EE';
const BORDER = '#000000';

type MenuButtonProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

function MenuButton({ title, subtitle, icon, color, onPress }: MenuButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="w-full mb-4 rounded-xl border-3 border-borderBlack bg-ivory p-5 shadow-brutal"
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      <View 
        className="w-14 h-14 rounded-xl border-2 border-borderBlack items-center justify-center mr-4"
        style={{ backgroundColor: color }}
      >
        <Ionicons name={icon} size={28} color={CHARCOAL} />
      </View>
      <View className="flex-1">
        <Text className="font-black text-lg text-charcoal mb-0.5">{title}</Text>
        <Text className="font-medium text-sm text-charcoal/80 leading-5" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={CHARCOAL} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUserStore((state) => state.user);

  return (
    <ScrollView
      className="flex-1 bg-sand"
      contentContainerStyle={{
        paddingBottom: 40 + insets.bottom,
        paddingTop: Math.max(insets.top, 20) + 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5">
        {/* Header Section - Tighter Spacing */}
        <View className="mb-6 items-center">
            <Image
              source={require('../../assets/branding/koedoelogo.png')}
            style={{ height: 120, width: 120, resizeMode: 'contain' }}
            className="mb-4"
            />
          
          <Text className="font-heading font-black text-4xl text-charcoal leading-[48px] mb-2 text-center uppercase tracking-tight">
            Slim. Sterk.{'\n'}Afrikaans.
          </Text>
          
          <Text className="font-medium text-lg text-charcoal leading-6 text-center px-4">
            Jou Afrikaanse AI-assistent vir elke dag.
          </Text>
        </View>

        {/* Menu Buttons */}
        <View className="mt-2">
          <MenuButton
            title="Klets met Koedoe"
            subtitle="Vra Koedoe enigeiets of kry hulp met enige taak."
            icon="chatbubbles"
            color={YELLOW}
            onPress={() => router.push('/(tabs)/chat')}
          />
          
          <MenuButton
            title="Fotos"
            subtitle="Laai op, verbeter, of maak iets nuut."
            icon="images"
            color={TEAL}
            onPress={() => router.push('/(tabs)/fotos')}
          />
          
          <MenuButton
            title="Dokumente"
            subtitle="Laai op vir samevatting, verduideliking of analise."
            icon="document-text"
            color={COPPER}
            onPress={() => router.push('/(tabs)/dokumente')}
          />

          <MenuButton
            title="Meer Hulpmiddels"
            subtitle="Ontdek meer gereedskap vir werk en leer."
            icon="grid"
            color="#E8E2D6" // Sand color for subtle look
            onPress={() => {
              // Placeholder action or navigate to a tools list
              // For now, maybe just settings or keep it as is
            }}
          />
        </View>

        {/* Quick Action: Start Chat */}
        <TouchableOpacity
          className="mt-4 rounded-full bg-copper border-3 border-borderBlack py-4 px-6 shadow-brutal items-center flex-row justify-center"
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <Text className="font-black text-xl text-ivory mr-2">Klets met Koedoe</Text>
          <Ionicons name="arrow-forward" size={24} color={IVORY} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
