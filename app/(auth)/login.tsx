import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRouter, Link } from 'expo-router';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    if (!data.user) {
      setAuthError('Geen gebruiker teruggestuur nie. Kontak ondersteuning.');
      setIsSubmitting(false);
      return;
    }

    setUser({
      id: data.user.id,
      email: data.user.email ?? null,
      displayName: data.user.user_metadata?.display_name ?? null,
    });

    setIsSubmitting(false);
    router.replace('/(tabs)');
  });

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
      <View className="rounded-xl bg-card p-6 border border-border">
        <Text className="font-semibold text-4xl text-foreground">Afrikaner.ai</Text>
        <Text className="mt-3 font-normal text-base text-muted">Welkom terug! Meld aan om te gesels.</Text>
      </View>

      <View className="mt-6 space-y-4">
        <Text className="font-semibold text-sm uppercase text-foreground">E-pos</Text>
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
              className="mt-2 rounded-xl border border-border bg-background px-4 py-3 font-normal text-base text-foreground"
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
        {errors.email ? <Text className="mt-2 font-medium text-sm text-accent">{errors.email.message}</Text> : null}
      </View>

      <View className="mt-4">
        <Text className="font-semibold text-sm uppercase text-foreground">Wagwoord</Text>
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
              className="mt-2 rounded-xl border border-border bg-background px-4 py-3 font-normal text-base text-foreground"
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
          <Text className="mt-2 font-medium text-sm text-accent">{errors.password.message}</Text>
        ) : null}
      </View>

      {authError ? <Text className="mt-4 font-semibold text-sm text-accent">{authError}</Text> : null}

      <TouchableOpacity
        className="mt-2 self-end"
        onPress={() => router.push('/(auth)/forgot')}
        disabled={isSubmitting}
      >
        <Text className="font-medium text-sm text-accent">Wagwoord vergeet?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 rounded-xl bg-accent py-3.5"
        disabled={isSubmitting}
        onPress={onSubmit}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-center font-medium text-base text-white">Meld aan</Text>
        )}
      </TouchableOpacity>

      <View className="mt-4 flex-row items-center justify-center">
        <Text className="font-medium text-base text-foreground">Het jy nie 'n rekening nie?</Text>
        <Link href="/(auth)/register" className="ml-2 font-semibold text-base text-accent">
          Registreer
        </Link>
      </View>
    </KeyboardAwareScrollView>
  );
}

