import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRouter, Link } from 'expo-router';
import { ActivityIndicator, Alert, Image, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { signInWithProvider } from '@/lib/auth';
import { track } from '@/lib/analytics';

const LOGO = require('../../assets/branding/koedoelogo.png');

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const insets = useSafeAreaInsets();

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

    // Ensure session is properly set and refresh user store from session
    await useUserStore.getState().hydrateFromSupabaseSession();

    setIsSubmitting(false);
    router.replace('/(tabs)');
  });

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      if (provider === 'apple' && Platform.OS !== 'ios') {
        Alert.alert('Net beskikbaar op iOS', 'Teken op ’n iOS-toestel aan met Apple of gebruik Google in die tussentyd.');
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
    <KeyboardAwareScrollView
      className="bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 48,
        paddingBottom: Math.max(insets.bottom + 40, 80),
        justifyContent: 'center',
      }}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={32}
    >
      {/* Header Section with Logo */}
      <View className="items-center mb-8">
        <Image
          source={LOGO}
          style={{ height: 120, width: 220, resizeMode: 'contain' }}
          className="mb-6"
        />
        <Text className="font-heading font-bold text-2xl text-foreground text-center tracking-wide">
          WELKOM BY KOEDOE
        </Text>
        <Text className="mt-2 font-normal text-lg text-accent text-center tracking-widest uppercase">
          Slim. Sterk. Afrikaans.
        </Text>
      </View>

      <View className="mt-2 space-y-4">
        <Text className="font-semibold text-sm uppercase text-foreground ml-1">E-pos</Text>
        <Controller
          control={control}
          name="email"
          rules={{
            required: 'E-pos is verpligtend.',
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Voer ’n geldige e-posadres in.',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="mt-1 rounded-2xl border border-border bg-card px-4 py-4 font-normal text-base text-foreground"
              placeholder="jou@epos.com"
              placeholderTextColor="#8E8EA0"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email ? <Text className="mt-1 font-medium text-sm text-accent ml-1">{errors.email.message}</Text> : null}
      </View>

      <View className="mt-4">
        <Text className="font-semibold text-sm uppercase text-foreground ml-1">Wagwoord</Text>
        <Controller
          control={control}
          name="password"
          rules={{
            required: 'Wagwoord is verpligtend.',
            minLength: {
              value: 6,
              message: 'Gebruik minstens 6 karakters vir jou wagwoord.',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="mt-1 rounded-2xl border border-border bg-card px-4 py-4 font-normal text-base text-foreground"
              placeholder="jou wagwoord"
              placeholderTextColor="#8E8EA0"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.password ? (
          <Text className="mt-1 font-medium text-sm text-accent ml-1">{errors.password.message}</Text>
        ) : null}
      </View>

      {authError ? <Text className="mt-4 font-semibold text-sm text-accent text-center">{authError}</Text> : null}

      <TouchableOpacity
        className="mt-2 self-end"
        onPress={() => router.push('/(auth)/forgot')}
        disabled={isSubmitting}
      >
        <Text className="font-medium text-sm text-accent">Wagwoord vergeet?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-8 rounded-full bg-accent py-4"
        disabled={isSubmitting}
        onPress={onSubmit}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-center font-bold text-base text-white uppercase tracking-wide">Meld aan</Text>
        )}
      </TouchableOpacity>

      <View className="mt-6">
        <Text className="text-center font-medium text-sm uppercase text-muted tracking-widest">
          Of meld vinniger aan
        </Text>
        <View className="mt-4 space-y-3">
          <TouchableOpacity
            className="flex-row items-center justify-center gap-3 rounded-full border border-border bg-card py-3.5"
            onPress={() => handleSocialAuth('google')}
            disabled={!!socialLoading}
            accessibilityRole="button"
          >
            <Ionicons name="logo-google" size={20} color="#E8E2D6" />
            <Text className="font-semibold text-base text-foreground">
              {socialLoading === 'google' ? 'Verbind…' : 'Meld aan met Google'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-row items-center justify-center gap-3 rounded-full border border-border py-3.5 ${
              Platform.OS === 'ios' ? 'bg-card' : 'bg-card/60'
            }`}
            onPress={() => handleSocialAuth('apple')}
            disabled={!!socialLoading}
            accessibilityRole="button"
          >
            <Ionicons name="logo-apple" size={22} color="#E8E2D6" />
            <Text className="font-semibold text-base text-foreground">
              {socialLoading === 'apple' ? 'Verbind…' : 'Meld aan met Apple'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="mt-6 flex-row items-center justify-center">
        <Text className="font-medium text-base text-muted">Het jy nie 'n rekening nie?</Text>
        <Link href="/(auth)/register" className="ml-2 font-bold text-base text-foreground">
          Registreer
        </Link>
      </View>
    </KeyboardAwareScrollView>
  );
}
