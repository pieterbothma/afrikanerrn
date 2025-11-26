import { useState, useRef, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRouter, Link } from 'expo-router';
import { ActivityIndicator, Alert, Image, Platform, Text, TextInput, TouchableOpacity, View, Animated } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { signInWithProvider } from '@/lib/auth';
import { track } from '@/lib/analytics';

const ACCENT = '#DE7356'; // Copper
const TEAL = '#3EC7E3'; // Teal for focused inputs
const YELLOW = '#FFD800'; // Yellow for accents
const CHARCOAL = '#1A1A1A';
const BORDER = '#000000';
const LOGO = require('../../assets/branding/koedoelogo.png');

type LoginFormValues = {
  email: string;
  password: string;
};

// Animated input field component
function AnimatedInput({
  label,
  icon,
  error,
  ...inputProps
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
} & React.ComponentProps<typeof TextInput>) {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BORDER, TEAL],
  });

  return (
    <View className="mb-3">
      <Text className="font-bold text-sm text-charcoal mb-1 ml-1 uppercase tracking-wider">{label}</Text>
      <Animated.View
        className="rounded-xl overflow-hidden bg-white shadow-sm"
        style={{ borderWidth: 2, borderColor }}
      >
        <View className="flex-row items-center px-4 h-14">
          <Ionicons name={icon} size={20} color={CHARCOAL} />
          <TextInput
            className="flex-1 h-full px-3 font-medium text-base text-charcoal"
            placeholderTextColor="#8E8EA0"
            textAlignVertical="center"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...inputProps}
          />
        </View>
      </Animated.View>
      {error && (
        <View className="flex-row items-center mt-1.5 ml-1 gap-1">
          <Ionicons name="alert-circle" size={14} color="#E63946" />
          <Text className="font-bold text-sm text-errorRed">{error}</Text>
        </View>
      )}
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const insets = useSafeAreaInsets();

  // Animation refs
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(logoAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(formAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, [logoAnim, formAnim]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setAuthError(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message ?? 'Kon nie aanmeld nie. Probeer asseblief weer.');
      setIsSubmitting(false);
      return;
    }

    if (!data.user || !data.session) {
      setAuthError('Geen gebruiker teruggestuur nie. Kontak ondersteuning.');
      setIsSubmitting(false);
      return;
    }

    await useUserStore.getState().hydrateFromSupabaseSession();

    setIsSubmitting(false);
    router.replace('/(tabs)');
  });

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      if (provider === 'apple' && Platform.OS !== 'ios') {
        Alert.alert('Net beskikbaar op iOS', "Teken op 'n iOS-toestel aan met Apple of gebruik Google in die tussentyd.");
        return;
      }
      setSocialLoading(provider);
      track('oauth_attempt', { provider, mode: 'login' });
      await signInWithProvider(provider);
      track('oauth_success', { provider, mode: 'login' });
      router.replace('/(tabs)');
    } catch (error: any) {
      track('oauth_error', { provider, mode: 'login', message: error?.message });
      Alert.alert('Oeps!', error?.message ?? 'Kon nie aanmeld met sosiale rekening nie.');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <View className="flex-1 bg-sand">
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: Math.max(insets.bottom + 24, 48),
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={32}
      >
        {/* Animated Header Section with Logo */}
        <Animated.View 
          className="items-center mb-4"
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
          <Image source={LOGO} style={{ height: 100, width: 180, resizeMode: 'contain' }} className="mb-4" />
          <Text className="font-heading font-bold text-3xl text-charcoal text-center">
            Welkom by <Text className="font-black text-4xl">KOEDOE</Text>
          </Text>
          <Text className="mt-2 font-bold text-lg text-teal text-center tracking-widest uppercase">
            Slim. Sterk. Afrikaans.
          </Text>
          <Text className="mt-1 font-medium text-xs text-charcoal/60 text-center tracking-wide">
            Jou Afrikaanse AI-assistent
          </Text>
        </Animated.View>

        {/* Animated Form Section */}
        <Animated.View
          style={{
            opacity: formAnim,
            transform: [{
              translateY: formAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            }],
          }}
        >
          {/* Email Input */}
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'E-pos is verpligtend.',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Voer 'n geldige e-posadres in.",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AnimatedInput
                label="E-POS"
                icon="mail-outline"
                placeholder="jou@epos.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          {/* Password Input */}
          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Wagwoord is verpligtend.',
              minLength: {
                value: 6,
                message: 'Gebruik minstens 6 karakters.',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AnimatedInput
                label="WAGWOORD"
                icon="lock-closed-outline"
                placeholder="Jou wagwoord"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          {/* Auth Error */}
          {authError && (
            <View className="bg-errorRed/10 border-2 border-errorRed rounded-xl p-3 mb-4 flex-row items-center gap-2">
              <Ionicons name="warning" size={20} color="#E63946" />
              <Text className="font-bold text-sm text-errorRed flex-1">{authError}</Text>
            </View>
          )}

          {/* Forgot Password */}
          <TouchableOpacity
            className="self-end mb-4"
            onPress={() => router.push('/(auth)/forgot')}
            disabled={isSubmitting}
          >
            <Text className="font-bold text-sm text-charcoal underline">Wagwoord vergeet?</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            className="rounded-xl bg-copper border-2 border-borderBlack py-4 mb-4 shadow-brutal"
            disabled={isSubmitting}
            onPress={onSubmit}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View className="flex-row items-center justify-center gap-2">
                <Text className="font-black text-lg text-white uppercase tracking-wide">Meld Aan</Text>
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-4">
            <View className="flex-1 h-0.5 bg-[#3A3A3A]/20" />
            <Text className="px-4 font-bold text-sm text-[#3A3A3A]/60">OF</Text>
            <View className="flex-1 h-0.5 bg-[#3A3A3A]/20" />
          </View>

          {/* Social Auth */}
          <View className="gap-3 mb-6">
            <TouchableOpacity
              className="flex-row items-center justify-center gap-3 rounded-xl border-2 border-borderBlack bg-white py-4 shadow-brutal-sm"
              onPress={() => handleSocialAuth('google')}
              disabled={!!socialLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color={CHARCOAL} />
              <Text className="font-bold text-base text-charcoal">
                {socialLoading === 'google' ? 'Verbind…' : 'Gaan voort met Google'}
              </Text>
            </TouchableOpacity>
            
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                className="flex-row items-center justify-center gap-3 rounded-xl border-2 border-borderBlack bg-white py-4 shadow-brutal-sm"
                onPress={() => handleSocialAuth('apple')}
                disabled={!!socialLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-apple" size={22} color={CHARCOAL} />
                <Text className="font-bold text-base text-charcoal">
                  {socialLoading === 'apple' ? 'Verbind…' : 'Gaan voort met Apple'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Register Button */}
          <View className="pb-4 mt-2">
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity 
                className="rounded-xl bg-yellow border-2 border-borderBlack py-3 shadow-brutal-sm flex-row items-center justify-center gap-2"
                activeOpacity={0.8}
              >
                <Text className="font-black text-base text-charcoal uppercase tracking-wide">Skep 'n Rekening</Text>
                <Ionicons name="person-add" size={20} color={CHARCOAL} />
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}
