import { useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, TextInput, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { requestMediaLibraryPermission } from '@/lib/permissions';
import { Ionicons } from '@expo/vector-icons';

import BrutalistCard from '@/components/BrutalistCard';
import { supabase } from '@/lib/supabase';
import { uploadImageToSupabase } from '@/lib/storage';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { getTodayUsage, USAGE_LIMITS, getUserTier } from '@/lib/usageLimits';
import { getSubscriptionTier, SubscriptionTier } from '@/lib/revenuecat';
import { useAppStore } from '@/store/appStore';

const ACCENT = '#B46E3A';
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

type TonePreset = 'formeel' | 'informeel' | 'vriendelik';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const resetOnboardingFlag = useAppStore((state) => state.resetOnboardingFlag);
  const conversations = useChatStore((state) => state.conversations);
  const messages = useChatStore((state) => state.messages);
  
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [tonePreset, setTonePreset] = useState<TonePreset>('informeel');
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [usage, setUsage] = useState<{ chat: number; image_generate: number; image_edit: number } | null>(null);
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    if (user?.id) {
      loadProfile();
      loadAnalytics();
      loadUsage();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) {
      return;
    }

    const { data, error } = await supabase.from('profiles').select('display_name, avatar_url, tone_preset').eq('id', user.id).single();

    if (!error && data) {
      setDisplayName(data.display_name || '');
      setTonePreset((data.tone_preset as TonePreset) || 'informeel');
      setAvatarUrl(data.avatar_url);
    }
  };

  const loadAnalytics = async () => {
    if (!user?.id) {
      return;
    }

    const { data } = await supabase.from('profiles').select('session_count').eq('id', user.id).single();
    if (data) {
      setSessionCount(data.session_count || conversations.length);
    } else {
      setSessionCount(conversations.length);
    }
  };

  const loadUsage = async () => {
    if (!user?.id) return;
    
    const [usageData, userTier, subTier] = await Promise.all([
      getTodayUsage(user.id),
      getUserTier(user.id),
      getSubscriptionTier(),
    ]);
    
    setUsage(usageData);
    setTier(userTier);
    setSubscriptionTier(subTier);
  };

  const showLimitsPopup = () => {
    if (!usage) return;

    const planName = tier === 'free' ? 'Gratis' : 'Premium';
    const limits = USAGE_LIMITS[tier];
    
    const message = `Jou ${planName} plan limiete:\n\n` +
      `• Boodskappe: ${limits.chat} per dag\n` +
      `• Beeld generasies: ${limits.image_generate} per dag\n` +
      `• Beeld wysigings: ${limits.image_edit} per dag\n\n` +
      `Huidige gebruik:\n` +
      `• Boodskappe: ${usage.chat}/${limits.chat}\n` +
      `• Beeld generasies: ${usage.image_generate}/${limits.image_generate}\n` +
      `• Beeld wysigings: ${usage.image_edit}/${limits.image_edit}`;

    Alert.alert('Daglimiete', message, [{ text: 'OK' }]);
  };

  const handleUpdateProfile = async () => {
    if (!user?.id || isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          tone_preset: tonePreset,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setUser({ ...user, displayName: displayName.trim() || null });
      Alert.alert('Sukses!', 'Profiel opgedateer.');
    } catch (error) {
      console.error('Kon nie profiel opdateer nie:', error);
      Alert.alert('Oeps!', 'Kon nie profiel opdateer nie. Probeer weer.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!user?.id) {
      return;
    }

    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: IMAGE_MEDIA_TYPES,
        quality: 0.8,
        allowsMultipleSelection: false,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uploadedUrl = await uploadImageToSupabase(asset.uri, user.id, `avatar-${user.id}`);
      setAvatarUrl(uploadedUrl || asset.uri);
    } catch (error) {
      console.error('Kon nie avatar kies nie:', error);
      Alert.alert('Oeps!', 'Kon nie avatar laai nie.');
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setIsSigningOut(false);
      Alert.alert('Kon nie afmeld nie', error.message ?? 'Probeer weer, asseblief.');
      return;
    }

    setUser(null);
    setIsSigningOut(false);
    router.replace('/(auth)/login');
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Herbegin onboarding?',
      'Ons sal die verwelkomingsgids weer wys wanneer jy die app volgende keer oopmaak.',
      [
        { text: 'Kanselleer', style: 'cancel' },
        {
          text: 'Herstel',
          style: 'destructive',
          onPress: async () => {
            await resetOnboardingFlag();
            Alert.alert('Gereed!', 'Onboarding sal weer vertoon word wanneer jy weer aanmeld.');
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 80 }}
        showsVerticalScrollIndicator={true}
      >
      <View className="rounded-xl bg-card p-6 border border-border">
        <Text className="font-semibold text-3xl text-foreground">Koedoe</Text>
        <Text className="mt-2 font-normal text-sm text-muted">Jou profiel</Text>
        <View className="mt-4 flex-row items-center gap-4">
          <TouchableOpacity onPress={handlePickAvatar} className="rounded-full border-2 border-border overflow-hidden">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="h-20 w-20" />
            ) : (
              <View className="h-20 w-20 items-center justify-center bg-accent">
                <Ionicons name="person" size={32} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <View className="flex-1">
            <TextInput
              className="rounded-lg border border-border bg-background px-3 py-2.5 font-medium text-base text-foreground"
              placeholder="Vertoonnaam"
              placeholderTextColor="#8E8EA0"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Text className="mt-1.5 font-normal text-sm text-muted">{user?.email ?? 'Geen e-pos beskikbaar'}</Text>
          </View>
        </View>
        <TouchableOpacity
          className="mt-4 rounded-xl bg-accent px-4 py-3.5"
          onPress={handleUpdateProfile}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-center font-medium text-base text-white">Stoor veranderinge</Text>
          )}
        </TouchableOpacity>
      </View>

      <BrutalistCard title="Taaltoon" description="Kies hoe jy wil dat Koedoe met jou praat.">
        <View className="mt-4 flex-row gap-3">
          {(['formeel', 'informeel', 'vriendelik'] as TonePreset[]).map((tone) => (
            <TouchableOpacity
              key={tone}
              className={`flex-1 rounded-lg px-4 py-3 ${
                tonePreset === tone ? 'bg-accent' : 'bg-background border border-border'
              }`}
              onPress={() => setTonePreset(tone)}
            >
              <Text
                className={`text-center font-medium text-sm ${tonePreset === tone ? 'text-white' : 'text-foreground'}`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BrutalistCard>

      <BrutalistCard title="Gebruiksstatistieke" description="Sien jou aktiwiteitsomvang.">
        <View className="mt-4 flex-row justify-between">
          <View>
            <Text className="font-semibold text-2xl text-foreground">{sessionCount}</Text>
            <Text className="mt-1 font-normal text-sm text-muted">Gesprekke</Text>
          </View>
          <View>
            <Text className="font-semibold text-2xl text-foreground">{messages.length}</Text>
            <Text className="mt-1 font-normal text-sm text-muted">Boodskappe</Text>
          </View>
          <View>
            <Text className="font-semibold text-2xl text-foreground">
              {messages.filter((m) => m.isFavorite).length}
            </Text>
            <Text className="mt-1 font-normal text-sm text-muted">Gunstelinge</Text>
          </View>
        </View>
      </BrutalistCard>

      <BrutalistCard title="Abonnement" description={subscriptionTier === 'free' ? 'Gradeer op na Premium vir hoër limiete.' : 'Jy het Premium toegang.'}>
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-semibold text-base text-foreground">Jou plan</Text>
            <View className="rounded-full bg-accent/10 px-2 py-1">
              <Text className="font-medium text-xs text-accent uppercase">
                {subscriptionTier === 'free' ? 'Gratis' : subscriptionTier === 'premium_monthly' ? 'Premium Maandeliks' : 'Premium Jaarliks'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="rounded-xl bg-accent px-4 py-3.5"
            onPress={() => router.push('/(tabs)/subscription')}
          >
            <Text className="text-center font-medium text-base text-white">
              {subscriptionTier === 'free' ? 'Word Premium Lid' : 'Bestuur Abonnement'}
            </Text>
          </TouchableOpacity>
        </View>
      </BrutalistCard>

      {usage && (
        <TouchableOpacity onPress={showLimitsPopup} activeOpacity={0.7}>
          <BrutalistCard title="Daglimiete" description="Tik om jou limiete te sien.">
            <View className="mt-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-semibold text-base text-foreground">Jou plan</Text>
              <View className="rounded-full bg-accent/10 px-2 py-1">
                <Text className="font-medium text-xs text-accent uppercase">
                  {tier === 'free' ? 'Gratis' : 'Premium'}
                </Text>
              </View>
            </View>
            
            <View className="gap-4">
              {(['chat', 'image_generate', 'image_edit'] as const).map((type) => {
                const current = usage[type];
                const limit = USAGE_LIMITS[tier][type];
                const remaining = Math.max(0, limit - current);
                const percentage = limit > 0 ? (current / limit) * 100 : 0;
                const isLow = remaining <= limit * 0.2 && remaining > 0;
                const isExceeded = remaining === 0;
                
                const labels = {
                  chat: 'Boodskappe',
                  image_generate: 'Beeld generasies',
                  image_edit: 'Beeld wysigings',
                };
                
                return (
                  <View key={type} className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-medium text-sm text-foreground">{labels[type]}</Text>
                      <Text
                        className={`font-semibold text-sm ${
                          isExceeded ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-foreground'
                        }`}
                      >
                        {current}/{limit}
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-muted overflow-hidden">
                      <View
                        className={`h-full ${
                          isExceeded ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-accent'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </View>
                    {isLow && !isExceeded && (
                      <Text className="font-normal text-xs text-orange-500">
                        {remaining} oor
                      </Text>
                    )}
                    {isExceeded && (
                      <Text className="font-normal text-xs text-red-500">
                        Limiet bereik - probeer môre weer
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </BrutalistCard>
        </TouchableOpacity>
      )}

      <View className="rounded-xl bg-card p-6 border border-border">
        <Text className="font-semibold text-xl text-foreground">Rekeningbeheer</Text>
        <Text className="mt-3 font-normal text-base text-muted">
          Meld af vanaf hierdie toestel of bestuur later jou toestelle en sessies.
        </Text>

        <TouchableOpacity
          className="mt-6 rounded-xl bg-accent px-4 py-3.5"
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          <Text className="text-center font-medium text-base text-white">
            {isSigningOut ? 'Meld tans af…' : 'Meld af'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4 rounded-xl border border-border px-4 py-3.5"
          onPress={handleResetOnboarding}
        >
          <Text className="text-center font-medium text-base text-foreground">
            Begin onboarding weer
          </Text>
          <Text className="mt-1 text-center text-xs text-muted">
            Perfek om iemand nuut die ervaring te wys.
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

