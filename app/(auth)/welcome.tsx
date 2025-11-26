import { useRef, useEffect } from 'react';
import { Image, Text, TouchableOpacity, View, Animated, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const LOGO = require('../../assets/branding/koedoelogo.png');

const CHARCOAL = '#1A1A1A';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(logoAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(buttonsAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, [logoAnim, buttonsAnim]);

  return (
    <View className="flex-1 bg-sand items-center justify-center px-6">
      {/* Animated Header Section with Logo */}
      <Animated.View 
        className="items-center mb-12 w-full"
        style={{
          opacity: logoAnim,
          transform: [{
            translateY: logoAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          }],
        }}
      >
        <Image source={LOGO} style={{ height: 140, width: 240, resizeMode: 'contain' }} className="mb-6" />
        <Text className="font-heading font-bold text-3xl text-charcoal text-center">
          Welkom by <Text className="font-black text-4xl">KOEDOE</Text>
        </Text>
        <Text className="mt-3 font-bold text-lg text-teal text-center tracking-widest uppercase">
          Slim. Sterk. Afrikaans.
        </Text>
        <Text className="mt-2 font-medium text-sm text-charcoal/80 text-center tracking-wide">
          Jou Afrikaanse AI-assistent
        </Text>
      </Animated.View>

      {/* Animated Buttons Section */}
      <Animated.View
        className="w-full gap-4"
        style={{
          opacity: buttonsAnim,
          transform: [{
            translateY: buttonsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          }],
        }}
      >
        {/* Login Button */}
        <TouchableOpacity
          className="rounded-xl bg-copper border-2 border-borderBlack py-4 shadow-brutal active:translate-y-1 active:shadow-none"
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.9}
        >
          <View className="flex-row items-center justify-center gap-2">
            <Text className="font-black text-lg text-white uppercase tracking-wide">Meld Aan</Text>
            <Ionicons name="log-in-outline" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Register Button */}
        <TouchableOpacity
          className="rounded-xl bg-yellow border-2 border-borderBlack py-4 shadow-brutal active:translate-y-1 active:shadow-none"
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.9}
        >
          <View className="flex-row items-center justify-center gap-2">
            <Text className="font-black text-lg text-charcoal uppercase tracking-wide">Skep 'n Rekening</Text>
            <Ionicons name="person-add-outline" size={24} color={CHARCOAL} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer / Copyright / Version - Optional */}
      <View className="absolute bottom-8 items-center opacity-40" style={{ paddingBottom: insets.bottom }}>
        <Text className="font-medium text-xs text-charcoal">Weergawe 1.0.0</Text>
      </View>
    </View>
  );
}

