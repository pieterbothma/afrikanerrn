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

import { supabase } from '@/lib/supabase';

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
      className="flex-1 bg-sand"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 }}>
        {/* Header Section */}
        <View className="items-center mb-8">
          <Image source={LOGO} style={{ height: 120, width: 220, resizeMode: 'contain' }} className="mb-6" />
          <Text className="font-heading font-black text-3xl text-charcoal text-center tracking-wide uppercase">
            Wagwoord Vergeet?
          </Text>
          <Text className="mt-2 font-bold text-lg text-teal text-center tracking-widest uppercase">
            Slim. Sterk. Afrikaans.
          </Text>
        </View>

        {/* Main Card */}
        <View className="bg-white rounded-xl border-3 border-borderBlack p-6 shadow-brutal">
          {/* Instructional Text */}
          <Text className="font-medium text-base text-[#1A1A1A] opacity-90 mb-1">
            Voer jou e-posadres in en ons stuur jou 'n skakel om jou wagwoord te herstel.
          </Text>

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
              <View className="mt-5 mb-2">
                <TextInput
                  className="rounded-xl border-2 border-borderBlack bg-white px-4 py-4 font-medium text-base text-charcoal"
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
                  <Text className="mt-2 font-bold text-sm text-errorRed">{error.message}</Text>
                )}
                
                {/* Microcopy */}
                <Text className="mt-2 font-medium text-xs text-charcoal/60">
                  Ons sal vir jou 'n skakel stuur om 'n nuwe wagwoord te kies.
                </Text>
              </View>
            )}
          />

          <TouchableOpacity
            className="mt-6 rounded-xl bg-copper border-2 border-borderBlack px-6 py-4 shadow-brutal-sm"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text className="text-center font-black text-lg text-white uppercase tracking-wide">
              {isSubmitting ? 'Stuur tans…' : 'Stuur herstel-skakel'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4"
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text className="text-center font-bold text-base text-charcoal/60">
              Terug na aanmelding
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
