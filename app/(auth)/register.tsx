import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { signInWithProvider } from '@/lib/auth';
import { track } from '@/lib/analytics';

const LOGO = require('../../assets/branding/koedoelogo.png');

type RegisterFormValues = {
  email: string;
  password: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const insets = useSafeAreaInsets();
  const [authError, setAuthError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

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
        'Rekening geskep. Bevestig jou e-posadres voordat jy kan aanmeld. Sodra dit gedoen is, kom meld aan.',
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
      setInfoMessage('Ons het ’n bevestigings-e-pos gestuur. Volg die skakel om jou rekening te aktiveer.');
    }
  });

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      if (provider === 'apple' && Platform.OS !== 'ios') {
        Alert.alert('Net beskikbaar op iOS', 'Gebruik asseblief ’n iOS-toestel of kies Google vir nou.');
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
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-1 px-6"
        style={{
          paddingTop: Math.max(insets.top, 48),
          paddingBottom: Math.max(insets.bottom + 40, 80),
        }}
      >
        <View className="items-center">
          <Image source={LOGO} style={{ height: 120, width: 220, resizeMode: 'contain' }} className="mb-6" />
          <Text className="font-heading font-bold text-2xl text-foreground text-center tracking-wide">
            WELKOM BY KOEDOE
          </Text>
          <Text className="mt-2 font-normal text-lg text-accent text-center tracking-widest uppercase">
            Slim. Sterk. Afrikaans.
          </Text>
        </View>

        <View className="mt-10 space-y-4">
          <View>
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
            {errors.email ? (
              <Text className="mt-1 font-medium text-sm text-accent ml-1">{errors.email.message}</Text>
            ) : null}
          </View>

          <View>
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
                  placeholder="kies 'n veilige wagwoord"
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

          {authError ? <Text className="font-semibold text-sm text-accent text-center">{authError}</Text> : null}
          {infoMessage ? (
            <Text className="font-semibold text-sm text-foreground text-center">{infoMessage}</Text>
          ) : null}

          <TouchableOpacity
            className="mt-6 rounded-full bg-accent py-4"
            disabled={isSubmitting}
            onPress={onSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-center font-bold text-base text-white uppercase tracking-wide">Skep rekening</Text>
            )}
          </TouchableOpacity>

          <View className="mt-6">
            <Text className="text-center font-medium text-sm uppercase text-muted tracking-widest">
              Of registreer binne ’n oomblik
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
                  {socialLoading === 'google' ? 'Verbind…' : 'Skep rekening met Google'}
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
                  {socialLoading === 'apple' ? 'Verbind…' : 'Skep rekening met Apple'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="font-medium text-base text-muted">Reeds ’n rekening?</Text>
            <Link href="/(auth)/login" className="ml-2 font-bold text-base text-foreground">
              Meld aan
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

