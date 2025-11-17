import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Parkinsans_700Bold } from '@expo-google-fonts/parkinsans';

import { useUserStore } from '@/store/userStore';
import { initMonitoring } from '@/lib/monitoring';
import { initializeRevenueCat, logoutRevenueCat } from '@/lib/revenuecat';
import '../global.css';

import 'react-native-url-polyfill/auto';

initMonitoring();

const ACCENT = '#DE7356';

export default function RootLayout() {
  const router = useRouter();
  const hydrateFromSupabaseSession = useUserStore((state) => state.hydrateFromSupabaseSession);
  const user = useUserStore((state) => state.user);
  const segments = useSegments();
  const [isHydrating, setIsHydrating] = useState(true);
  const [fontsLoaded] = useFonts({
    ParkinsansBold: Parkinsans_700Bold,
  });

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
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
  }, [hydrateFromSupabaseSession]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }

    if (user && !inTabsGroup && segments.length === 0) {
      router.replace('/(tabs)');
    }
  }, [isHydrating, router, segments, user]);

  const showSplash = isHydrating || !fontsLoaded;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={['top', 'left', 'right', 'bottom']}
      >
        {showSplash ? (
          <View className="flex-1 items-center justify-center gap-6 px-8">
            <View className="w-full rounded-xl bg-card px-6 py-10 border border-border">
              <Text className="text-center font-heading font-semibold text-4xl text-foreground">
                Afrikaner.ai
              </Text>
              <Text className="mt-4 text-center font-normal text-base text-muted">
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

