import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

type RegisterFormValues = {
  email: string;
  password: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <View className="rounded-xl bg-card p-6 border border-border">
        <Text className="font-semibold text-4xl text-foreground">Afrikaner.ai</Text>
        <Text className="mt-3 font-normal text-base text-muted">
          Skep jou Afrikaanse AI-rekening in enkele stappe.
        </Text>
      </View>

      <View className="mt-6 space-y-4">
        <View>
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

        <View>
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
            <Text className="mt-2 font-medium text-sm text-accent">{errors.password.message}</Text>
          ) : null}
        </View>

        {authError ? <Text className="font-semibold text-sm text-accent">{authError}</Text> : null}
        {infoMessage ? <Text className="font-semibold text-sm text-foreground">{infoMessage}</Text> : null}

        <TouchableOpacity
          className="mt-4 rounded-xl bg-accent py-3.5"
          disabled={isSubmitting}
          onPress={onSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-center font-medium text-base text-white">Skep rekening</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center justify-center">
          <Text className="font-medium text-base text-foreground">Reeds ’n rekening?</Text>
          <Link href="/(auth)/login" className="ml-2 font-semibold text-base text-accent">
            Meld aan
          </Link>
        </View>
      </View>
    </View>
  );
}

