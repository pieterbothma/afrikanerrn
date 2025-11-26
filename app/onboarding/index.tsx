import { useCallback, useRef, useState, useEffect } from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItem,
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '@/store/appStore';
import { track } from '@/lib/analytics';

const { width, height } = Dimensions.get('window');
const ACCENT = '#DE7356'; // Copper
const CHARCOAL = '#1A1A1A';
const BORDER = '#000000';

type SlideData = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  borderColor: string;
};

const slides: SlideData[] = [
  {
    id: '1',
    title: 'Praat in jou taal',
    description: 'Koedoe antwoord in natuurlike Afrikaans – jou idees, standpunte en stories klink net soos jy.',
    icon: 'chatbubbles',
    iconBg: '#FFD800', // Yellow
    borderColor: '#000000',
  },
  {
    id: '2',
    title: 'Skep & Skryf',
    description: 'Van besigheidsplanne tot gedigte – kry voorstelle, hersiene teks en kreatiewe idees binne sekondes.',
    icon: 'create',
    iconBg: '#3EC7E3', // Teal
    borderColor: '#000000',
  },
  {
    id: '3',
    title: 'Visuele krag',
    description: 'Gebruik AI om beelde te genereer of aan te pas vir jou projekte, veldtogte of klasopdragte.',
    icon: 'images',
    iconBg: '#DE7356', // Copper
    borderColor: '#000000',
  },
  {
    id: '4',
    title: 'Jou Koedoe, jou styl',
    description: 'Kies jou toon, hou jou gesprekke en bou op wat jy reeds gedoen het – alles veilig in jou taal.',
    icon: 'heart',
    iconBg: '#F7F3EE', // Ivory
    borderColor: '#000000',
  },
];

// Animated progress dot component
function ProgressDot({ isActive, index }: { isActive: boolean; index: number }) {
  const animatedWidth = useRef(new Animated.Value(isActive ? 24 : 8)).current;
  const animatedOpacity = useRef(new Animated.Value(isActive ? 1 : 0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedWidth, {
        toValue: isActive ? 24 : 8,
        useNativeDriver: false,
        friction: 8,
        tension: 50,
      }),
      Animated.timing(animatedOpacity, {
        toValue: isActive ? 1 : 0.4,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive, animatedWidth, animatedOpacity]);

  return (
    <Animated.View
      style={{
        width: animatedWidth,
        height: 8,
        borderRadius: 4,
        backgroundColor: CHARCOAL,
        opacity: animatedOpacity,
      }}
    />
  );
}

// Animated icon component
function AnimatedIcon({ icon, bgColor, borderColor }: { icon: keyof typeof Ionicons.glyphMap; bgColor: string; borderColor: string }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        backgroundColor: bgColor,
        width: 100,
        height: 100,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 3,
        borderColor: borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
      }}
    >
      <Ionicons name={icon} size={48} color={CHARCOAL} />
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const setHasSeenOnboardingFlag = useAppStore((state) => state.setHasSeenOnboardingFlag);
  const listRef = useRef<FlatList<SlideData>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalSlides = slides.length;
  const isLastSlide = currentIndex === totalSlides - 1;
  
  // Animation for logo entrance
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoTranslate, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, [logoOpacity, logoTranslate]);

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

  const renderItem: ListRenderItem<SlideData> = ({ item }) => (
    <View style={{ width }} className="px-6">
      <View
        className="flex-1 rounded-3xl border-3 border-borderBlack px-6 py-10 mt-6 bg-ivory shadow-brutal"
      >
        <View className="items-center">
          <AnimatedIcon 
            icon={item.icon} 
            bgColor={item.iconBg} 
            borderColor={item.borderColor}
          />
          
          <Text className="font-heading font-black text-3xl text-center text-charcoal mb-4">
            {item.title}
          </Text>
          
          <Text className="font-medium text-lg text-center text-charcoal/80 leading-7 px-2">
            {item.description}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-sand">
      {/* Header with Logo and Skip */}
      <View className="flex-row items-center justify-between px-6 pt-16">
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslate }],
          }}
        >
          <Image
            source={require('../../assets/branding/koedoelogo.png')}
            style={{ height: 48, width: 140, resizeMode: 'contain' }}
          />
        </Animated.View>
        
        {!isLastSlide && (
          <TouchableOpacity 
            onPress={handleSkip} 
            accessibilityRole="button"
            className="py-2 px-4 rounded-full bg-white border-2 border-borderBlack shadow-sm"
          >
            <Text className="font-bold text-sm text-charcoal">Slaan oor</Text>
          </TouchableOpacity>
        )}
        {isLastSlide && <View style={{ width: 80 }} />}
      </View>

      {/* Slides */}
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
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Bottom section with progress and button */}
      <View className="px-6 pb-12 pt-4">
        {/* Animated Progress Dots */}
        <View className="flex-row justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <ProgressDot key={index} isActive={index === currentIndex} index={index} />
          ))}
        </View>

        {/* Next/Start Button */}
        <TouchableOpacity
          className="rounded-xl bg-copper border-2 border-borderBlack py-4 px-8 flex-row items-center justify-center gap-2 shadow-brutal"
          onPress={handleNext}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <Text className="font-black text-lg text-white uppercase tracking-wide">
            {isLastSlide ? 'Kom ons begin' : 'Volgende'}
          </Text>
          <Ionicons 
            name={isLastSlide ? 'rocket' : 'arrow-forward'} 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>

        {/* Page indicator text */}
        <Text className="text-center text-charcoal/60 font-bold text-sm mt-6">
          {currentIndex + 1} van {totalSlides}
        </Text>
      </View>
    </View>
  );
}
