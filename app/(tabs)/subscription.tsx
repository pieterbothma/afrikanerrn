import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrutalistCard from '@/components/BrutalistCard';
import { useUserStore } from '@/store/userStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  PurchasesPackage,
  SubscriptionTier,
  getSubscriptionTier,
  PRODUCT_IDS,
} from '@/lib/revenuecat';
import { USAGE_LIMITS } from '@/lib/usageLimits';

const ACCENT = '#DE7356';

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptionData();
    }
  }, [user?.id]);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const [tier, offering] = await Promise.all([
        getSubscriptionTier(),
        getOfferings(),
      ]);

      setCurrentTier(tier);

      if (offering && offering.availablePackages) {
        // Find monthly and yearly packages
        // Check both identifier and packageType for compatibility
        const monthly = offering.availablePackages.find(
          (pkg: any) => 
            pkg.identifier === 'monthly' || 
            pkg.identifier === PRODUCT_IDS.PREMIUM_MONTHLY ||
            pkg.packageType === 'MONTHLY' ||
            (pkg.product && (pkg.product.identifier === PRODUCT_IDS.PREMIUM_MONTHLY || pkg.product.identifier?.includes('monthly')))
        );
        const yearly = offering.availablePackages.find(
          (pkg: any) => 
            pkg.identifier === 'yearly' || 
            pkg.identifier === PRODUCT_IDS.PREMIUM_YEARLY ||
            pkg.packageType === 'ANNUAL' ||
            (pkg.product && (pkg.product.identifier === PRODUCT_IDS.PREMIUM_YEARLY || pkg.product.identifier?.includes('yearly') || pkg.product.identifier?.includes('annual')))
        );

        setMonthlyPackage(monthly || null);
        setYearlyPackage(yearly || null);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      Alert.alert('Oeps!', 'Kon nie abonnement data laai nie. Probeer weer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (!user?.id) {
      Alert.alert('Meld aan', 'Jy moet aangemeld wees om te koop.');
      return;
    }

    setIsPurchasing(true);
    try {
      await purchasePackage(pkg);
      Alert.alert('Sukses!', 'Jou abonnement is aktief. Geniet premium funksies!', [
        {
          text: 'OK',
          onPress: () => {
            loadSubscriptionData();
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      if (error.message === 'Purchase cancelled') {
        // User cancelled - don't show error
        return;
      }
      console.error('Purchase failed:', error);
      Alert.alert('Oeps!', 'Kon nie abonnement koop nie. Probeer weer.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      await loadSubscriptionData();
      Alert.alert('Sukses!', 'Jou vorige aankope is herstel.');
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert('Oeps!', 'Kon nie aankope herstel nie. Probeer weer.');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatPrice = (pkg: PurchasesPackage) => {
    return pkg.product.priceString;
  };

  const getSavings = () => {
    if (!monthlyPackage || !yearlyPackage) return null;
    
    const monthlyPrice = monthlyPackage.product.price;
    const yearlyPrice = yearlyPackage.product.price;
    const monthlyYearlyTotal = monthlyPrice * 12;
    
    if (yearlyPrice < monthlyYearlyTotal) {
      const savings = monthlyYearlyTotal - yearlyPrice;
      const savingsPercent = Math.round((savings / monthlyYearlyTotal) * 100);
      return { amount: savings, percent: savingsPercent };
    }
    
    return null;
  };

  const savings = getSavings();

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={ACCENT} />
        <Text className="mt-4 font-normal text-base text-muted">Laai abonnement data...</Text>
      </View>
    );
  }

  const isPremium = currentTier !== 'free';

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-background"
        style={{ paddingTop: Math.max(insets.top, 16) }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#2C2C2C" />
        </TouchableOpacity>
        <Text className="font-semibold text-lg text-foreground">Premium Abonnement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 80,
          gap: 16,
        }}
        showsVerticalScrollIndicator={true}
      >
        {isPremium ? (
          <BrutalistCard
            title="Jy het Premium!"
            description={`Jy het 'n aktiewe ${currentTier === 'premium_monthly' ? 'maandelikse' : 'jaarlikse'} abonnement.`}
          >
            <View className="mt-4">
              <TouchableOpacity
                className="rounded-xl bg-accent px-4 py-3.5"
                onPress={handleRestore}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-center font-medium text-base text-white">
                    Herstel Aankope
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </BrutalistCard>
        ) : (
          <>
            <BrutalistCard
              title="Word Premium Lid"
              description="Kry toegang tot hoër limiete en alle premium funksies."
            >
              <View className="mt-4 gap-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                  <Text className="font-normal text-sm text-foreground">
                    {USAGE_LIMITS.premium.chat} boodskappe per dag (vs {USAGE_LIMITS.free.chat})
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                  <Text className="font-normal text-sm text-foreground">
                    {USAGE_LIMITS.premium.image_generate} beeld generasies per dag (vs {USAGE_LIMITS.free.image_generate})
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                  <Text className="font-normal text-sm text-foreground">
                    {USAGE_LIMITS.premium.image_edit} beeld wysigings per dag (vs {USAGE_LIMITS.free.image_edit})
                  </Text>
                </View>
              </View>
            </BrutalistCard>

            <View className="gap-3">
              {yearlyPackage && (
                <TouchableOpacity
                  onPress={() => handlePurchase(yearlyPackage)}
                  disabled={isPurchasing}
                  activeOpacity={0.7}
                  className="rounded-xl bg-card border-2 border-accent p-5"
                >
                  {savings && (
                    <View className="absolute top-2 right-2 rounded-full bg-accent px-2 py-1">
                      <Text className="font-semibold text-xs text-white">
                        SPAAR {savings.percent}%
                      </Text>
                    </View>
                  )}
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-semibold text-xl text-foreground">Jaarliks</Text>
                    <Text className="font-semibold text-xl text-accent">
                      {formatPrice(yearlyPackage)}
                    </Text>
                  </View>
                  <Text className="font-normal text-sm text-muted">
                    Beter waarde vir langtermyn gebruik
                  </Text>
                </TouchableOpacity>
              )}

              {monthlyPackage && (
                <TouchableOpacity
                  onPress={() => handlePurchase(monthlyPackage)}
                  disabled={isPurchasing}
                  activeOpacity={0.7}
                  className="rounded-xl bg-card border border-border p-5"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-semibold text-xl text-foreground">Maandeliks</Text>
                    <Text className="font-semibold text-xl text-foreground">
                      {formatPrice(monthlyPackage)}
                    </Text>
                  </View>
                  <Text className="font-normal text-sm text-muted">
                    Maandeliks gekanselleerbaar
                  </Text>
                </TouchableOpacity>
              )}

              {!monthlyPackage && !yearlyPackage && (
                <BrutalistCard
                  title="Geen Pakkette Beskikbaar"
                  description="Abonnement pakkette sal binnekort beskikbaar wees."
                />
              )}
            </View>

            <TouchableOpacity
              onPress={handleRestore}
              disabled={isRestoring}
              className="rounded-xl bg-background border border-border px-4 py-3.5"
            >
              {isRestoring ? (
                <ActivityIndicator color={ACCENT} />
              ) : (
                <Text className="text-center font-medium text-base text-foreground">
                  Herstel Vorige Aankope
                </Text>
              )}
            </TouchableOpacity>

            <Text className="font-normal text-xs text-muted text-center px-4">
              Abonnemente word deur jou App Store/Play Store rekening gehef. Jy kan dit enige tyd kanselleer in jou toestel se instellings.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

