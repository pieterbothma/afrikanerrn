import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';

import BrutalistCard from '@/components/BrutalistCard';
import { supabase } from '@/lib/supabase';

const ACCENT = '#DE7356';

type ForgotPasswordForm = {
  email: string;
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: 'afrikanerai://reset-password',
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'E-pos gestuur',
        'Kyk jou e-pos vir instruksies om jou wagwoord te herstel. Jy kan hierdie skerm nou sluit.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error: any) {
      console.error('Wagwoord herstel gefaal:', error);
      Alert.alert('Oeps!', error.message || 'Kon nie wagwoord herstel nie. Probeer weer.');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
      >
        <View className="mb-8">
          <Text className="font-semibold text-center text-4xl text-foreground">Afrikaner.ai</Text>
          <Text className="mt-4 font-normal text-center text-lg text-muted">Herstel wagwoord</Text>
        </View>

        <BrutalistCard
          title="Wagwoord vergeet?"
          description="Voer jou e-posadres in en ons stuur jou 'n skakel om jou wagwoord te herstel."
        >
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'E-pos is verpligtend',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Ongeldige e-posadres',
              },
            }}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <View className="mt-4">
                <TextInput
                  className="rounded-xl border border-border bg-background px-4 py-3 font-normal text-base text-foreground"
                  placeholder="jou@epos.co.za"
                  placeholderTextColor="#8E8EA0"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                />
                {error && (
                  <Text className="mt-2 font-medium text-sm text-accent">{error.message}</Text>
                )}
              </View>
            )}
          />

          <TouchableOpacity
            className="mt-6 rounded-xl bg-accent px-6 py-4"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text className="text-center font-medium text-lg text-white">
              {isSubmitting ? 'Stuur tans…' : 'Stuur herstel-skakel'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4"
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text className="text-center font-medium text-base text-muted">
              Terug na aanmelding
            </Text>
          </TouchableOpacity>
        </BrutalistCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

