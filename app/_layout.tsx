import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight';

import { useUserStore } from '@/store/userStore';
import { useAppStore } from '@/store/appStore';
import { initMonitoring } from '@/lib/monitoring';
import { initializeRevenueCat, logoutRevenueCat } from '@/lib/revenuecat';
import '../global.css';

import 'react-native-url-polyfill/auto';

initMonitoring();

const ACCENT = '#B46E3A'; // Horn Copper

export default function RootLayout() {
  const router = useRouter();
  const hydrateFromSupabaseSession = useUserStore((state) => state.hydrateFromSupabaseSession);
  const user = useUserStore((state) => state.user);
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);
  const hydrateOnboarding = useAppStore((state) => state.hydrateOnboarding);
  const segments = useSegments();
  const [isHydrating, setIsHydrating] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
    InterTight: InterTight_700Bold,
  });

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      await hydrateOnboarding();
      const userProfile = await hydrateFromSupabaseSession();

      // Initialize RevenueCat if user is logged in
      if (userProfile?.id) {
        try {
          await initializeRevenueCat(userProfile.id);
        } catch (error) {
          console.warn('Failed to initialize RevenueCat:', error);
          // Continue even if RevenueCat fails
        }
      } else {
        // Logout from RevenueCat if user is not logged in
        try {
          await logoutRevenueCat();
        } catch (error) {
          console.warn('Failed to logout RevenueCat:', error);
        }
      }

      if (isMounted) {
        setIsHydrating(false);
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [hydrateFromSupabaseSession, hydrateOnboarding]);

  useEffect(() => {
    if (isHydrating || hasSeenOnboarding === null) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user) {
      if (hasSeenOnboarding === false) {
        if (!inOnboarding) {
          router.replace('/onboarding');
        }
        return;
      }

      if (!inAuthGroup) {
        router.replace('/(auth)/login');
        return;
      }
    }

    if (user && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
      return;
    }

    if (user && !inTabsGroup && segments.length === 0) {
      router.replace('/(tabs)');
    }
  }, [hasSeenOnboarding, isHydrating, router, segments, user]);

  const showSplash = isHydrating || !fontsLoaded || hasSeenOnboarding === null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={['top', 'left', 'right', 'bottom']}
      >
        {showSplash ? (
          <View className="flex-1 items-center justify-center gap-6 px-8 bg-background">
            <View className="w-full rounded-xl bg-card px-6 py-10 border border-border">
              <Text className="text-center font-heading font-bold text-4xl text-foreground">
                Koedoe
              </Text>
              <Text className="mt-4 text-center font-sans font-normal text-base text-muted">
                Praat. Skryf. Leer. Bou – in Afrikaans.
              </Text>
            </View>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          <Slot />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
