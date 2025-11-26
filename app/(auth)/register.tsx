import { useState, useRef, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { signInWithProvider } from '@/lib/auth';
import { track } from '@/lib/analytics';

const ACCENT = '#DE7356'; // Copper
const TEAL = '#3EC7E3'; // Teal for focused inputs
const CHARCOAL = '#1A1A1A';
const BORDER = '#000000';
const LOGO = require('../../assets/branding/koedoelogo.png');

type RegisterFormValues = {
  email: string;
  password: string;
};

// Animated input field component
function AnimatedInput({
  label,
  icon,
  error,
  containerStyle,
  ...inputProps
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerStyle?: string;
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
    <View className={containerStyle}>
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

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const insets = useSafeAreaInsets();
  const [authError, setAuthError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(headerAnim, {
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
  }, [headerAnim, formAnim]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setAuthError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message ?? 'Kon nie registreer nie. Probeer asseblief weer.');
      setIsSubmitting(false);
      return;
    }

    if (!data.user) {
      setInfoMessage(
        'Rekening geskep! Bevestig jou e-posadres en kom dan aanmeld.',
      );
      setIsSubmitting(false);
      return;
    }

    setUser({
      id: data.user.id,
      email: data.user.email ?? null,
      displayName: data.user.user_metadata?.display_name ?? null,
    });

    setIsSubmitting(false);

    if (data.session) {
      router.replace('/(tabs)');
    } else {
      setInfoMessage("Ons het 'n bevestigings-e-pos gestuur. Volg die skakel om jou rekening te aktiveer.");
    }
  });

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      if (provider === 'apple' && Platform.OS !== 'ios') {
        Alert.alert('Net beskikbaar op iOS', "Gebruik asseblief 'n iOS-toestel of kies Google vir nou.");
        return;
      }
      setSocialLoading(provider);
      track('oauth_attempt', { provider, mode: 'register' });
      await signInWithProvider(provider);
      track('oauth_success', { provider, mode: 'register' });
      router.replace('/(tabs)');
    } catch (error: any) {
      track('oauth_error', { provider, mode: 'register', message: error?.message });
      Alert.alert('Oeps!', error?.message ?? 'Kon nie registreer met sosiale rekening nie.');
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
          paddingBottom: Math.max(insets.bottom + 48, 96),
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={32}
      >
        {/* Animated Header */}
        <Animated.View 
          className="items-center mb-10"
          style={{
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
          }}
        >
          <Image source={LOGO} style={{ height: 120, width: 220, resizeMode: 'contain' }} className="mb-6" />
          <Text className="font-heading font-black text-3xl text-charcoal text-center">
            Skep Jou Rekening
          </Text>
          <Text className="mt-2 font-medium text-sm text-charcoal/80 text-center">
            Begin jou reis met Koedoe AI
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
                label="E-pos"
                icon="mail-outline"
                placeholder="jou@epos.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
                containerStyle="mb-6"
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
                placeholder="Kies 'n wagwoord"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                containerStyle="mb-10"
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

          {/* Info Message */}
          {infoMessage && (
            <View className="bg-veldGreen/10 border-2 border-veldGreen rounded-xl p-3 mb-4 flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={20} color="#3AA66E" />
              <Text className="font-bold text-sm text-veldGreen flex-1">{infoMessage}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            className="mt-2 rounded-xl bg-copper border-2 border-borderBlack py-4 mb-6 shadow-brutal"
            disabled={isSubmitting}
            onPress={onSubmit}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View className="flex-row items-center justify-center gap-2">
                <Text className="font-black text-lg text-white tracking-wide">Skep rekening</Text>
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-0.5 bg-[#3A3A3A]/20" />
            <Text className="px-4 font-bold text-sm text-[#3A3A3A]/60">OF</Text>
            <View className="flex-1 h-0.5 bg-[#3A3A3A]/20" />
          </View>

          {/* Social Auth */}
          <View className="gap-3 mb-8">
            <TouchableOpacity
              className="flex-row items-center justify-center gap-3 rounded-xl border-2 border-borderBlack bg-white py-4 shadow-brutal-sm"
              onPress={() => handleSocialAuth('google')}
              disabled={!!socialLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color={CHARCOAL} />
              <Text className="font-bold text-base text-charcoal">
                {socialLoading === 'google' ? 'Verbind…' : 'Registreer met Google'}
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
                  {socialLoading === 'apple' ? 'Verbind…' : 'Registreer met Apple'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Login Link */}
          <View className="flex-row items-center justify-center pb-4">
            <Text className="font-medium text-base text-[#555555]">Reeds 'n rekening?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity className="ml-1">
                <Text className="font-black text-base text-copper underline">Meld aan</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}
