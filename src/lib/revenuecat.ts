/**
 * RevenueCat service for managing subscriptions
 * 
 * Requires:
 * - EXPO_PUBLIC_REVENUECAT_API_KEY (from RevenueCat dashboard)
 * - Product IDs configured in App Store Connect and Google Play Console
 */

import { Platform } from 'react-native';

// Lazy import to avoid errors when native module isn't available (e.g., Expo Go, web)
let Purchases: any = null;
let CustomerInfo: any = null;
let PurchasesOffering: any = null;
let PurchasesPackage: any = null;

try {
  const PurchasesModule = require('react-native-purchases');
  Purchases = PurchasesModule.default;
  CustomerInfo = PurchasesModule.CustomerInfo;
  PurchasesOffering = PurchasesModule.PurchasesOffering;
  PurchasesPackage = PurchasesModule.PurchasesPackage;
} catch (error) {
  console.warn('react-native-purchases not available. Subscriptions will be disabled.');
}

// Product IDs - these should match what you configure in RevenueCat dashboard
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_YEARLY: 'premium_yearly',
} as const;

export type SubscriptionTier = 'free' | 'premium_monthly' | 'premium_yearly';
export type PremiumTier = 'premium_monthly' | 'premium_yearly';

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts, after user authentication
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (!Purchases) {
    console.warn('RevenueCat SDK not available. Subscriptions will not work.');
    return;
  }

  if (isInitialized) {
    return;
  }

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  
  if (!apiKey) {
    console.warn('RevenueCat API key not found. Subscriptions will not work.');
    return;
  }

  try {
    await Purchases.configure({ apiKey });
    
    // Set the app user ID to match Supabase user ID
    await Purchases.logIn(userId);
    
    isInitialized = true;
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    // Don't throw - allow app to continue without RevenueCat
  }
}

/**
 * Log out the current user (call on sign out)
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!Purchases) {
    return;
  }

  try {
    await Purchases.logOut();
    isInitialized = false;
  } catch (error) {
    console.error('Failed to logout RevenueCat:', error);
  }
}

/**
 * Get current customer info and subscription status
 */
export async function getCustomerInfo(): Promise<any | null> {
  if (!Purchases) {
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Get user's subscription tier from RevenueCat
 * Returns 'free' if no active subscription
 */
export async function getSubscriptionTier(): Promise<SubscriptionTier> {
  if (!Purchases) {
    return 'free';
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Check for active entitlements
    if (customerInfo?.entitlements?.active?.['premium']) {
      const productIdentifier = customerInfo.entitlements.active['premium'].productIdentifier;
      
      if (productIdentifier === PRODUCT_IDS.PREMIUM_MONTHLY) {
        return 'premium_monthly';
      }
      if (productIdentifier === PRODUCT_IDS.PREMIUM_YEARLY) {
        return 'premium_yearly';
      }
      
      // If premium entitlement exists but product ID doesn't match, assume monthly
      return 'premium_monthly';
    }
    
    return 'free';
  } catch (error) {
    console.error('Failed to get subscription tier:', error);
    return 'free';
  }
}

/**
 * Check if user has any active premium subscription
 */
export async function hasPremiumSubscription(): Promise<boolean> {
  const tier = await getSubscriptionTier();
  return tier !== 'free';
}

/**
 * Get available offerings (subscription packages)
 */
export async function getOfferings(): Promise<any | null> {
  if (!Purchases) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    
    // Return the current offering (usually the default)
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: any): Promise<any> {
  if (!Purchases) {
    throw new Error('RevenueCat SDK not available');
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (error.userCancelled) {
      throw new Error('Purchase cancelled');
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<any> {
  if (!Purchases) {
    throw new Error('RevenueCat SDK not available');
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    throw error;
  }
}

/**
 * Check if user is eligible for promotional offer
 */
export async function checkPromotionalOfferEligibility(productId: string): Promise<boolean> {
  if (!Purchases) {
    return false;
  }

  try {
    // Note: This method may not be available in all SDK versions
    // @ts-ignore - Type may not be available
    const eligibility = await Purchases.checkPromotionalDiscountEligibility?.(productId);
    return eligibility ?? false;
  } catch (error) {
    console.error('Failed to check promotional offer eligibility:', error);
    return false;
  }
}

