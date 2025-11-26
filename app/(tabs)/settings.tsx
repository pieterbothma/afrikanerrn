import { useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, TextInput, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { requestMediaLibraryPermission } from '@/lib/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { uploadImageToSupabase } from '@/lib/storage';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { getTodayUsage, USAGE_LIMITS, getUserTier } from '@/lib/usageLimits';
import { getSubscriptionTier, SubscriptionTier } from '@/lib/revenuecat';
import { useAppStore } from '@/store/appStore';

const ACCENT = '#DE7356'; // Copper
const CHARCOAL = '#1A1A1A';
const IMAGE_MEDIA_TYPES: ImagePicker.MediaType[] = ['images'];

// Section header component
function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View className="flex-row items-center gap-2 mb-3 mt-6 ml-1">
      <Ionicons name={icon} size={18} color={CHARCOAL} />
      <Text className="font-bold text-sm text-charcoal uppercase tracking-wider">{title}</Text>
    </View>
  );
}

// Stat card component
function StatCard({ value, label, icon }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View className="flex-1 bg-ivory border-2 border-borderBlack rounded-xl p-4 items-center shadow-brutal-sm">
      <View className="w-10 h-10 rounded-lg bg-yellow border border-borderBlack items-center justify-center mb-2">
        <Ionicons name={icon} size={20} color={CHARCOAL} />
      </View>
      <Text className="font-black text-2xl text-charcoal">{value}</Text>
      <Text className="font-bold text-xs text-charcoal/60 mt-1 uppercase">{label}</Text>
    </View>
  );
}

type TonePreset = 'formeel' | 'informeel' | 'vriendelik';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View className="flex-1 bg-sand">
      <BackHeader title="Instellings" />

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section - Hero Card */}
        <View
          className="rounded-xl p-6 border-2 border-borderBlack mt-4 bg-ivory shadow-brutal"
        >
          <View className="flex-row items-center gap-4">
            <TouchableOpacity 
              onPress={handlePickAvatar} 
              className="relative"
              activeOpacity={0.8}
            >
              <View className="rounded-full border-2 border-borderBlack overflow-hidden">
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} className="h-20 w-20" />
                ) : (
                  <View className="h-20 w-20 items-center justify-center bg-yellow">
                    <Ionicons name="person" size={32} color={CHARCOAL} />
                  </View>
                )}
              </View>
              <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-copper items-center justify-center border-2 border-borderBlack">
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="font-heading font-black text-2xl text-charcoal">
                {displayName || 'Jou Naam'}
              </Text>
              <Text className="font-medium text-sm text-charcoal/60 mt-0.5">{user?.email ?? 'Geen e-pos'}</Text>
              <View className="flex-row items-center gap-1 mt-2">
                <View className={`px-2 py-0.5 rounded-md border border-borderBlack ${subscriptionTier === 'free' ? 'bg-white' : 'bg-yellow'}`}>
                  <Text className={`text-xs font-bold text-charcoal`}>
                    {subscriptionTier === 'free' ? 'Gratis' : 'Premium'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <View className="mt-4">
            <Text className="font-bold text-xs text-charcoal uppercase tracking-wider mb-2">Vertoonnaam</Text>
            <TextInput
              className="rounded-xl border-2 border-borderBlack bg-white px-4 py-3 font-medium text-base text-charcoal"
              placeholder="Vertoonnaam"
              placeholderTextColor="#8E8EA0"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>
          
          <TouchableOpacity
            className="mt-4 rounded-xl bg-copper border-2 border-borderBlack py-3.5 shadow-brutal-sm"
            onPress={handleUpdateProfile}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            {isUpdating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text className="font-black text-base text-white uppercase">Stoor Veranderinge</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Statistics Section */}
        <SectionHeader title="Statistieke" icon="stats-chart" />
        <View className="flex-row gap-3">
          <StatCard value={sessionCount} label="Gesprekke" icon="chatbubbles-outline" />
          <StatCard value={messages.length} label="Boodskappe" icon="document-text-outline" />
          <StatCard value={messages.filter((m) => m.isFavorite).length} label="Gunstelinge" icon="star-outline" />
        </View>

        {/* Preferences Section */}
        <SectionHeader title="Voorkeure" icon="options" />
        <View className="rounded-xl bg-ivory border-2 border-borderBlack p-4 shadow-brutal-sm">
          <Text className="font-bold text-base text-charcoal mb-1">Taaltoon</Text>
          <Text className="font-medium text-sm text-charcoal/60 mb-4">Kies hoe Koedoe met jou praat</Text>
          <View className="flex-row gap-2">
            {(['formeel', 'informeel', 'vriendelik'] as TonePreset[]).map((tone) => (
              <TouchableOpacity
                key={tone}
                className={`flex-1 rounded-xl px-3 py-3 border-2 ${
                  tonePreset === tone ? 'bg-teal border-borderBlack' : 'bg-white border-borderBlack'
                }`}
                onPress={() => setTonePreset(tone)}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-center font-bold text-sm text-charcoal`}
                >
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subscription Section */}
        <SectionHeader title="Abonnement" icon="diamond" />
        <TouchableOpacity 
          className="rounded-xl bg-ivory border-2 border-borderBlack p-4 shadow-brutal-sm"
          onPress={() => router.push('/(tabs)/subscription')}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-xl bg-yellow border-2 border-borderBlack items-center justify-center">
                <Ionicons name={subscriptionTier === 'free' ? 'gift-outline' : 'diamond'} size={24} color={CHARCOAL} />
              </View>
              <View>
                <Text className="font-bold text-base text-charcoal">
                  {subscriptionTier === 'free' ? 'Gratis Plan' : 'Premium Plan'}
                </Text>
                <Text className="font-medium text-sm text-charcoal/60">
                  {subscriptionTier === 'free' ? 'Gradeer op vir meer' : 'Aktief'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={CHARCOAL} />
          </View>
        </TouchableOpacity>

        {/* Usage Section */}
        {usage && (
          <>
            <SectionHeader title="Daglimiete" icon="analytics" />
            <View className="rounded-xl bg-ivory border-2 border-borderBlack p-4 shadow-brutal-sm">
              <View className="gap-4">
                {(['chat', 'image_generate', 'image_edit'] as const).map((type) => {
                  const current = usage[type];
                  const limit = USAGE_LIMITS[tier][type];
                  const remaining = Math.max(0, limit - current);
                  const percentage = limit > 0 ? (current / limit) * 100 : 0;
                  const isLow = remaining <= limit * 0.2 && remaining > 0;
                  const isExceeded = remaining === 0;
                  
                  const config = {
                    chat: { label: 'Boodskappe', icon: 'chatbubble-outline' as const },
                    image_generate: { label: 'Beeld Generasies', icon: 'brush-outline' as const },
                    image_edit: { label: 'Beeld Wysigings', icon: 'color-wand-outline' as const },
                  };
                  
                  return (
                    <View key={type} className="gap-2">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <Ionicons name={config[type].icon} size={16} color={CHARCOAL} />
                          <Text className="font-bold text-sm text-charcoal">{config[type].label}</Text>
                        </View>
                        <Text
                          className={`font-black text-sm ${
                            isExceeded ? 'text-errorRed' : isLow ? 'text-copper' : 'text-charcoal'
                          }`}
                        >
                          {current}/{limit}
                        </Text>
                      </View>
                      <View className="h-3 rounded-full bg-white border border-borderBlack overflow-hidden">
                        <View
                          className={`h-full ${
                            isExceeded ? 'bg-errorRed' : isLow ? 'bg-copper' : 'bg-teal'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Account Section */}
        <SectionHeader title="Rekening" icon="person-circle" />
        <View className="gap-3">
          <TouchableOpacity
            className="rounded-xl bg-white border-2 border-borderBlack px-4 py-4 flex-row items-center justify-between shadow-brutal-sm"
            onPress={handleSignOut}
            disabled={isSigningOut}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-lg bg-errorRed/10 border border-errorRed/20 items-center justify-center">
                <Ionicons name="log-out-outline" size={20} color="#E63946" />
              </View>
              <Text className="font-black text-base text-charcoal">
                {isSigningOut ? 'Meld tans af…' : 'Meld Af'}
              </Text>
            </View>
            {isSigningOut ? (
              <ActivityIndicator color="#E63946" size="small" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={CHARCOAL} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-xl bg-white border-2 border-borderBlack px-4 py-4 flex-row items-center justify-between shadow-brutal-sm"
            onPress={handleResetOnboarding}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="refresh-outline" size={22} color={CHARCOAL} />
              <View>
                <Text className="font-bold text-base text-charcoal">Herstel Onboarding</Text>
                <Text className="font-medium text-xs text-charcoal/60">Wys die verwelkomingsgids weer</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={CHARCOAL} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="mt-8 items-center">
          <Text className="font-bold text-xs text-charcoal/40 uppercase tracking-widest">Koedoe AI • v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}
