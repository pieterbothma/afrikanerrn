import { ScrollView, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrutalistCard from '@/components/BrutalistCard';

const ACCENT = '#DE7356';

const CATEGORIES = [
  { id: 'small-business', name: 'Klein Besigheid', icon: 'business' },
  { id: 'studies', name: 'Studies', icon: 'school' },
  { id: 'writing', name: 'Skryfwerk', icon: 'create' },
  { id: 'translation', name: 'Vertaling', icon: 'language' },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    // Navigate to chat and potentially set a category filter or prompt
    // For now, just show a placeholder
    Alert.alert('Kom binnekort', `${categoryName} funksies sal binnekort beskikbaar wees.`);
    // TODO: Navigate to chat with category-specific prompts or filters
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-background"
        style={{ paddingTop: Math.max(insets.top, 16) }}
      >
        <Text className="font-semibold text-xl text-foreground">Kategoriee</Text>
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
          title="Verken Kategoriee"
          description="Kies 'n kategorie om gespesialiseerde hulp te kry."
        />

        <View className="mt-6 gap-3">
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              className="rounded-xl bg-card border border-border px-5 py-4"
              onPress={() => handleCategoryPress(category.id, category.name)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-4">
                <View className="rounded-full bg-accent/10 w-12 h-12 items-center justify-center">
                  <Ionicons name={category.icon as any} size={24} color={ACCENT} />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-lg text-foreground">{category.name}</Text>
                  <Text className="mt-1 font-normal text-sm text-muted">
                    Gespesialiseerde hulp vir {category.name.toLowerCase()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8EA0" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
