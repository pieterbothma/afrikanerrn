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

import { BackHeader } from '@/components/Header';
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

const ACCENT = '#DE7356'; // Copper
const CHARCOAL = '#1A1A1A';
const YELLOW = '#FFD800';
const TEAL = '#3EC7E3';

// Comparison row component
function ComparisonRow({
  feature,
  freeValue,
  premiumValue,
  isHighlight = false,
}: {
  feature: string;
  freeValue: string | number;
  premiumValue: string | number;
  isHighlight?: boolean;
}) {
  return (
    <View className={`flex-row items-center py-3 border-b-2 border-borderBlack ${isHighlight ? 'bg-yellow/20' : ''}`}>
      <Text className="flex-1 font-bold text-sm text-charcoal">{feature}</Text>
      <View className="w-20 items-center">
        <Text className="text-sm font-medium text-charcoal/60">{freeValue}</Text>
      </View>
      <View className="w-20 items-center">
        <Text className="text-sm text-copper font-black">{premiumValue}</Text>
      </View>
    </View>
  );
}

// Feature check item
function FeatureItem({ text, included = true }: { text: string; included?: boolean }) {
  return (
    <View className="flex-row items-center gap-3 py-2">
      <View className={`w-6 h-6 rounded-full border-2 border-borderBlack items-center justify-center ${included ? 'bg-teal' : 'bg-charcoal/10'}`}>
        <Ionicons 
          name={included ? 'checkmark' : 'close'} 
          size={14} 
          color={included ? CHARCOAL : '#8E8EA0'} 
        />
      </View>
      <Text className={`flex-1 text-sm font-bold ${included ? 'text-charcoal' : 'text-charcoal/50'}`}>
        {text}
      </Text>
    </View>
  );
}

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
      <View className="flex-1 bg-sand items-center justify-center">
        <View className="w-16 h-16 rounded-2xl bg-yellow border-2 border-borderBlack items-center justify-center mb-4">
          <ActivityIndicator size="large" color={CHARCOAL} />
        </View>
        <Text className="font-bold text-base text-charcoal">Laai abonnement data...</Text>
      </View>
    );
  }

  const isPremium = currentTier !== 'free';

  return (
    <View className="flex-1 bg-sand">
      <BackHeader title="Premium" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isPremium ? (
          // Premium User View
          <View
            className="rounded-xl p-6 border-2 border-borderBlack bg-teal shadow-brutal"
          >
            <View className="items-center">
              <View className="w-20 h-20 rounded-2xl bg-white border-2 border-borderBlack items-center justify-center mb-4">
                <Ionicons name="diamond" size={40} color={CHARCOAL} />
              </View>
              <Text className="font-heading font-black text-3xl text-charcoal text-center">
                Jy het Premium!
              </Text>
              <View className="mt-2 px-4 py-1.5 rounded-full bg-white border-2 border-borderBlack">
                <Text className="text-charcoal text-sm font-bold uppercase">
                  {currentTier === 'premium_monthly' ? 'Maandeliks' : 'Jaarliks'}
                </Text>
              </View>
              <Text className="mt-4 text-charcoal font-medium text-center">
                Geniet al die voordele van jou premium abonnement.
              </Text>
            </View>

            <View className="mt-6 gap-2">
              <FeatureItem text={`${USAGE_LIMITS.premium.chat} boodskappe per dag`} />
              <FeatureItem text={`${USAGE_LIMITS.premium.image_generate} beeld generasies per dag`} />
              <FeatureItem text={`${USAGE_LIMITS.premium.image_edit} beeld wysigings per dag`} />
              <FeatureItem text="Prioriteit ondersteuning" />
            </View>

            <TouchableOpacity
              className="mt-6 rounded-xl bg-white border-2 border-borderBlack px-4 py-3.5 shadow-brutal-sm"
              onPress={handleRestore}
              disabled={isRestoring}
              activeOpacity={0.7}
            >
              {isRestoring ? (
                <ActivityIndicator color={CHARCOAL} />
              ) : (
                <Text className="text-center font-black text-base text-charcoal uppercase">
                  Herstel Aankope
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Hero Section */}
            <View
              className="rounded-xl p-6 border-3 border-borderBlack mb-6 bg-yellow shadow-brutal"
            >
              <View className="items-center">
                <View className="w-16 h-16 rounded-2xl bg-white border-2 border-borderBlack items-center justify-center mb-4">
                  <Ionicons name="diamond" size={32} color={CHARCOAL} />
                </View>
                <Text className="font-heading font-black text-3xl text-charcoal text-center uppercase">
                  Word Premium Lid
                </Text>
                <Text className="mt-2 text-charcoal font-bold text-center">
                  Ontsluit die volle krag van Koedoe AI
                </Text>
                </View>
            </View>

            {/* Comparison Table */}
            <View className="rounded-xl bg-ivory border-2 border-borderBlack overflow-hidden mb-6 shadow-brutal-sm">
              <View className="flex-row items-center py-3 px-4 bg-white border-b-2 border-borderBlack">
                <Text className="flex-1 font-black text-sm text-charcoal uppercase">Funksie</Text>
                <View className="w-20 items-center">
                  <Text className="font-black text-xs text-charcoal/60 uppercase">GRATIS</Text>
                </View>
                <View className="w-20 items-center">
                  <Text className="font-black text-xs text-copper uppercase">PREMIUM</Text>
                </View>
              </View>
              <View className="px-4">
                <ComparisonRow 
                  feature="Boodskappe/dag" 
                  freeValue={USAGE_LIMITS.free.chat} 
                  premiumValue={USAGE_LIMITS.premium.chat} 
                  isHighlight 
                />
                <ComparisonRow 
                  feature="Beeld generasies" 
                  freeValue={USAGE_LIMITS.free.image_generate} 
                  premiumValue={USAGE_LIMITS.premium.image_generate} 
                />
                <ComparisonRow 
                  feature="Beeld wysigings" 
                  freeValue={USAGE_LIMITS.free.image_edit} 
                  premiumValue={USAGE_LIMITS.premium.image_edit} 
                />
                <ComparisonRow 
                  feature="Prioriteit" 
                  freeValue="—" 
                  premiumValue="✓" 
                />
              </View>
            </View>

            {/* Pricing Cards */}
            <Text className="font-bold text-xs text-charcoal uppercase tracking-wider mb-3 ml-1">
              Kies jou plan
            </Text>

            <View className="gap-3 mb-6">
              {yearlyPackage && (
                <TouchableOpacity
                  onPress={() => handlePurchase(yearlyPackage)}
                  disabled={isPurchasing}
                  activeOpacity={0.8}
                  className="rounded-xl border-2 border-borderBlack overflow-hidden bg-copper shadow-brutal"
                >
                  <View
                    className="p-5"
                  >
                    {savings && (
                      <View className="absolute top-3 right-3 rounded-full bg-yellow border border-borderBlack px-3 py-1 shadow-sm">
                        <Text className="font-black text-xs text-charcoal">
                          SPAAR {savings.percent}%
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center gap-3 mb-3">
                      <View className="w-12 h-12 rounded-xl bg-white border-2 border-borderBlack items-center justify-center">
                        <Ionicons name="star" size={24} color={ACCENT} />
                      </View>
                      <View>
                        <Text className="font-black text-xl text-white uppercase">Jaarliks</Text>
                        <Text className="text-xs text-white/80 font-bold uppercase">Beste waarde</Text>
                      </View>
                    </View>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="font-black text-3xl text-white">
                        {formatPrice(yearlyPackage)}
                      </Text>
                      <Text className="text-white/80 font-bold text-sm">/jaar</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {monthlyPackage && (
                <TouchableOpacity
                  onPress={() => handlePurchase(monthlyPackage)}
                  disabled={isPurchasing}
                  activeOpacity={0.8}
                  className="rounded-xl bg-ivory border-2 border-borderBlack p-5 shadow-brutal-sm"
                >
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="w-12 h-12 rounded-xl bg-white border-2 border-borderBlack items-center justify-center">
                      <Ionicons name="calendar" size={24} color={CHARCOAL} />
                    </View>
                    <View>
                      <Text className="font-black text-xl text-charcoal uppercase">Maandeliks</Text>
                      <Text className="text-xs text-charcoal/60 font-bold uppercase">Kanselleer enige tyd</Text>
                    </View>
                  </View>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="font-black text-3xl text-charcoal">
                      {formatPrice(monthlyPackage)}
                    </Text>
                    <Text className="text-charcoal/60 font-bold text-sm">/maand</Text>
                  </View>
                </TouchableOpacity>
              )}

              {!monthlyPackage && !yearlyPackage && (
                <View className="rounded-xl bg-ivory border-2 border-borderBlack p-6 items-center shadow-brutal-sm">
                  <Ionicons name="hourglass-outline" size={32} color={CHARCOAL} />
                  <Text className="font-bold text-base text-charcoal mt-3 uppercase">
                    Pakkette Kom Binnekort
                  </Text>
                  <Text className="text-sm text-charcoal/60 mt-1 text-center font-medium">
                    Abonnement opsies sal binnekort beskikbaar wees.
                  </Text>
                </View>
              )}
            </View>

            {/* Restore Button */}
            <TouchableOpacity
              onPress={handleRestore}
              disabled={isRestoring}
              className="rounded-xl bg-white border-2 border-borderBlack px-4 py-3.5 flex-row items-center justify-center gap-2 shadow-brutal-sm"
              activeOpacity={0.7}
            >
              {isRestoring ? (
                <ActivityIndicator color={CHARCOAL} size="small" />
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color={CHARCOAL} />
                  <Text className="font-black text-base text-charcoal uppercase">
                    Herstel Vorige Aankope
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Disclaimer */}
            <Text className="font-medium text-xs text-charcoal/40 text-center px-4 mt-6 mb-8">
              Abonnemente word deur jou App Store/Play Store rekening gehef. Jy kan dit enige tyd kanselleer in jou toestel se instellings.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
