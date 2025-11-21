import { supabase } from './supabase';
import { getSubscriptionTier, SubscriptionTier } from './revenuecat';

export type UsageType = 'chat' | 'image_generate' | 'image_edit';
export type UserTier = 'free' | 'premium';

// Usage limits for each tier
export const USAGE_LIMITS: Record<UserTier, Record<UsageType, number>> = {
  free: {
    chat: 40,
    image_generate: 3,
    image_edit: 3,
  },
  premium: {
    chat: 1000, // High limit for premium (both monthly and yearly)
    image_generate: 100,
    image_edit: 100,
  },
};

/**
 * Convert RevenueCat subscription tier to UserTier
 */
function subscriptionTierToUserTier(subscriptionTier: SubscriptionTier): UserTier {
  return subscriptionTier === 'free' ? 'free' : 'premium';
}

/**
 * Get today's usage count for a specific type
 */
export async function getTodayUsageCount(userId: string, type: UsageType): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', todayISO);

  if (error) {
    console.error('Kon nie gebruik tel nie:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get user's tier from RevenueCat subscription status
 * Falls back to database if RevenueCat is not available
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    // First, try to get tier from RevenueCat
    const subscriptionTier = await getSubscriptionTier();
    const tier = subscriptionTierToUserTier(subscriptionTier);
    
    // Sync to database for backup/analytics
    await syncTierToDatabase(userId, subscriptionTier);
    
    return tier;
  } catch (error) {
    console.warn('Failed to get tier from RevenueCat, falling back to database:', error);
    
    // Fallback to database
    const { data, error: dbError } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single();

    if (dbError || !data) {
      return 'free';
    }

    return (data.tier as UserTier) || 'free';
  }
}

/**
 * Sync subscription tier to database (for backup and analytics)
 */
async function syncTierToDatabase(userId: string, subscriptionTier: SubscriptionTier): Promise<void> {
  try {
    const tier = subscriptionTierToUserTier(subscriptionTier);
    
    await supabase
      .from('profiles')
      .update({ tier })
      .eq('id', userId);
  } catch (error) {
    // Silently fail - this is just for backup/analytics
    console.warn('Failed to sync tier to database:', error);
  }
}

/**
 * Check if user has reached their limit for a usage type
 */
export async function checkUsageLimit(userId: string, type: UsageType): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}> {
  const tier = await getUserTier(userId);
  const limit = USAGE_LIMITS[tier][type];
  const current = await getTodayUsageCount(userId, type);

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

/**
 * Log usage to the database
 */
export async function logUsage(userId: string, type: UsageType): Promise<void> {
  // Verify Supabase session matches userId
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData?.session?.user?.id;
  
  if (!authUserId) {
    console.error('[RLS Debug] Geen Supabase sessie vir usage log');
    return; // Silently fail usage logging if not authenticated
  }
  
  if (authUserId !== userId) {
    console.error(`[RLS Debug] Usage log sessie mismatch: auth.uid()=${authUserId}, userId=${userId}`);
    return; // Silently fail if mismatch
  }

  const { error } = await supabase.from('usage_logs').insert({
    user_id: userId,
    type,
  });

  if (error) {
    console.error('Kon nie gebruik log nie:', error);
    console.error('[RLS Debug] Volledige usage log fout:', JSON.stringify(error, null, 2));
  }
}

/**
 * Get all today's usage counts for a user
 */
export async function getTodayUsage(userId: string): Promise<Record<UsageType, number>> {
  const [chat, imageGenerate, imageEdit] = await Promise.all([
    getTodayUsageCount(userId, 'chat'),
    getTodayUsageCount(userId, 'image_generate'),
    getTodayUsageCount(userId, 'image_edit'),
  ]);

  return {
    chat,
    image_generate: imageGenerate,
    image_edit: imageEdit,
  };
}

