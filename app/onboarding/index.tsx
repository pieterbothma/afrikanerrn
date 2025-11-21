import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAppStore } from '@/store/appStore';
import { track } from '@/lib/analytics';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Praat in jou taal',
    description: 'Koedoe antwoord in natuurlike Afrikaans – jou idees, standpunte en stories klink net soos jy.',
  },
  {
    id: '2',
    title: 'Skep & Skryf',
    description: 'Van besigheidsplanne tot gedigte – kry voorstelle, hersiene teks en kreatiewe idees binne sekondes.',
  },
  {
    id: '3',
    title: 'Visuele krag',
    description: 'Gebruik AI om beelde te genereer of aan te pas vir jou projekte, veldtogte of klasopdragte.',
  },
  {
    id: '4',
    title: 'Jou Koedoe, jou styl',
    description: 'Kies jou toon, hou jou gesprekke en bou op wat jy reeds gedoen het – alles veilig in jou taal.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const setHasSeenOnboardingFlag = useAppStore((state) => state.setHasSeenOnboardingFlag);
  const listRef = useRef<FlatList<typeof slides[number]>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalSlides = slides.length;
  const isLastSlide = currentIndex === totalSlides - 1;

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== undefined) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const completeOnboarding = useCallback(async () => {
    track('onboarding_completed');
    await setHasSeenOnboardingFlag(true);
    router.replace('/(auth)/register');
  }, [router, setHasSeenOnboardingFlag]);

  const handleNext = async () => {
    if (isLastSlide) {
      await completeOnboarding();
      return;
    }

    const nextIndex = currentIndex + 1;
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const renderItem: ListRenderItem<typeof slides[number]> = ({ item }) => (
    <View style={{ width }} className="px-6">
      <View className="mt-12 items-center">
        <Image
          source={require('../../assets/branding/koedoelogo.png')}
          style={{ height: 120, width: 220, resizeMode: 'contain' }}
        />
      </View>
      <View className="mt-10 rounded-3xl border border-border bg-card px-6 py-8">
        <Text className="font-heading text-2xl text-center text-foreground mb-3">{item.title}</Text>
        <Text className="font-normal text-base text-center text-muted leading-6">{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <View className="items-end px-6 pt-16">
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} accessibilityRole="button">
            <Text className="font-medium text-sm text-accent uppercase tracking-wide">Slaan oor</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
      />
      <View className="px-6 pb-16 pt-8">
        <View className="flex-row justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full ${index === currentIndex ? 'w-8 bg-accent' : 'w-2 bg-border'}`}
            />
          ))}
        </View>
        <TouchableOpacity
          className="rounded-full bg-accent py-4"
          onPress={handleNext}
          accessibilityRole="button"
        >
          <Text className="text-center font-bold text-base text-white uppercase tracking-wide">
            {isLastSlide ? 'Kom ons begin' : 'Volgende'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

