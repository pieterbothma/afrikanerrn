# RevenueCat Integration Setup Guide

## ✅ What's Been Implemented

1. **RevenueCat SDK Installed** - `react-native-purchases` package added
2. **RevenueCat Service Module** - `src/lib/revenuecat.ts` with all subscription functions
3. **Usage Limits Integration** - Updated to check RevenueCat subscription status
4. **Paywall Screen** - Beautiful subscription screen at `app/(tabs)/subscription.tsx`
5. **Settings Integration** - Subscription management added to settings screen
6. **Auto-initialization** - RevenueCat initializes automatically on app start

## 🔧 Configuration Required

### 1. Add RevenueCat API Key

Add your RevenueCat test API key to your `.env.local` file:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=your_test_api_key_here
```

**Where to find your API key:**
- Go to RevenueCat Dashboard → Your Project → API Keys
- Copy the **Public API Key** (starts with `rcw_` or similar)

### 2. Configure Products in RevenueCat Dashboard

1. **Create Products:**
   - Go to RevenueCat Dashboard → Products
   - Create two products:
     - `premium_monthly` (Monthly subscription)
     - `premium_yearly` (Annual subscription)

2. **Create Entitlement:**
   - Go to RevenueCat Dashboard → Entitlements
   - Create entitlement: `premium`
   - Attach both `premium_monthly` and `premium_yearly` products to this entitlement

3. **Create Offerings:**
   - Go to RevenueCat Dashboard → Offerings
   - Create a default offering
   - Add packages:
     - Package identifier: `monthly` → Product: `premium_monthly`
     - Package identifier: `yearly` → Product: `premium_yearly`

### 3. Configure App Store Connect (iOS)

1. **Create In-App Purchases:**
   - Go to App Store Connect → Your App → Features → In-App Purchases
   - Create subscription:
     - Product ID: `premium_monthly`
     - Type: Auto-Renewable Subscription
     - Duration: 1 Month
   - Create subscription:
     - Product ID: `premium_yearly`
     - Type: Auto-Renewable Subscription
     - Duration: 1 Year

2. **Link in RevenueCat:**
   - Go to RevenueCat Dashboard → Products → `premium_monthly`
   - Add App Store product: `premium_monthly`
   - Repeat for `premium_yearly`

### 4. Configure Google Play Console (Android)

1. **Create Subscriptions:**
   - Go to Google Play Console → Your App → Monetize → Subscriptions
   - Create subscription:
     - Product ID: `premium_monthly`
     - Billing period: Monthly
   - Create subscription:
     - Product ID: `premium_yearly`
     - Billing period: Yearly

2. **Link in RevenueCat:**
   - Go to RevenueCat Dashboard → Products → `premium_monthly`
   - Add Google Play product: `premium_monthly`
   - Repeat for `premium_yearly`

## 🧪 Testing

### Test API Key
Your test API key will work for:
- ✅ Testing subscription flows
- ✅ Testing purchase restoration
- ✅ Testing subscription status checks

### Sandbox Testing
- **iOS**: Use sandbox test accounts in App Store Connect
- **Android**: Use test accounts in Google Play Console
- **RevenueCat**: Use test mode in dashboard

## 📱 Usage

### For Users:
1. Go to Settings → Abonnement
2. Tap "Word Premium Lid" or "Bestuur Abonnement"
3. Choose Monthly or Yearly plan
4. Complete purchase through App Store/Play Store

### For Developers:
- Subscription status is automatically checked when checking usage limits
- Tier is synced to Supabase database for backup/analytics
- RevenueCat handles all subscription lifecycle events

## 🔄 Webhook Setup (Optional - For Production)

For production, set up RevenueCat webhooks to sync subscription status:

1. Go to RevenueCat Dashboard → Project Settings → Webhooks
2. Add webhook URL: `https://your-supabase-project.supabase.co/functions/v1/revenuecat-webhook`
3. Create Supabase Edge Function to handle webhook events
4. Update user tier in database when subscription changes

## 📝 Notes

- Test API key works for development and testing
- Switch to production API key when ready to launch
- Subscription status is checked in real-time from RevenueCat
- Database tier is synced as backup/analytics only
- Free plan is always available (no trial needed)

## 🐛 Troubleshooting

**"RevenueCat API key not found" warning:**
- Make sure `EXPO_PUBLIC_REVENUECAT_API_KEY` is in `.env.local` (never commit this file - see `SECURITY.md`)
- Restart Expo dev server after adding

**"No packages available":**
- Check that offerings are configured in RevenueCat dashboard
- Ensure products are linked to App Store/Play Store
- Verify API key is correct

**Purchase not working:**
- Ensure you're using sandbox/test accounts
- Check that products are approved in App Store Connect/Play Console
- Verify RevenueCat products are linked correctly

