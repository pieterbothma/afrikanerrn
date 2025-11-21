import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';

import BrutalistCard from '@/components/BrutalistCard';
import { supabase } from '@/lib/supabase';

const ACCENT = '#B46E3A';
const LOGO = require('../../assets/branding/koedoelogo.png');

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
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 }}>
        <View className="items-center mb-8">
          <Image source={LOGO} style={{ height: 120, width: 220, resizeMode: 'contain' }} className="mb-6" />
          <Text className="font-heading font-bold text-2xl text-foreground text-center tracking-wide">
            WELKOM BY KOEDOE
          </Text>
          <Text className="mt-2 font-normal text-lg text-accent text-center tracking-widest uppercase">
            Slim. Sterk. Afrikaans.
          </Text>
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
                  className="rounded-2xl border border-border bg-background px-4 py-4 font-normal text-base text-foreground"
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

