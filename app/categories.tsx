import { ScrollView, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrutalistCard from '@/components/BrutalistCard';

const ACCENT = '#DE7356'; // Copper
const CHARCOAL = '#1A1A1A';

const CATEGORIES = [
  { id: 'small-business', name: 'Klein Besigheid', icon: 'business', color: '#4ADE80' },
  { id: 'studies', name: 'Studies', icon: 'school', color: '#60A5FA' },
  { id: 'writing', name: 'Skryfwerk', icon: 'create', color: '#F472B6' },
  { id: 'translation', name: 'Vertaling', icon: 'language', color: '#FBBF24' },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    // Navigate to chat and potentially set a category filter or prompt
    Alert.alert('Kom binnekort', `${categoryName} funksies sal binnekort beskikbaar wees.`);
  };

  return (
    <View className="flex-1 bg-sand">
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b-3 border-borderBlack bg-sand"
        style={{ paddingTop: Math.max(insets.top, 16) }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={28} color={CHARCOAL} />
        </TouchableOpacity>
        <Text className="font-heading font-black text-xl text-charcoal">Kategorieë</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 80,
        }}
        showsVerticalScrollIndicator={true}
      >
        <BrutalistCard
          title="Verken Kategorieë"
          description="Kies 'n kategorie om gespesialiseerde hulp te kry."
          variant="featured"
        />

        <View className="mt-6 gap-3">
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              className="rounded-xl bg-ivory border-2 border-borderBlack px-5 py-4 shadow-brutal-sm"
              onPress={() => handleCategoryPress(category.id, category.name)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-4">
                <View 
                  className="rounded-lg border-2 border-borderBlack w-12 h-12 items-center justify-center"
                  style={{ backgroundColor: category.color }}
                >
                  <Ionicons name={category.icon as any} size={24} color={CHARCOAL} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-lg text-charcoal">{category.name}</Text>
                  <Text className="mt-1 font-medium text-sm text-charcoal/60">
                    Gespesialiseerde hulp vir {category.name.toLowerCase()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={CHARCOAL} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
