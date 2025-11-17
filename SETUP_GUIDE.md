# Afrikaner.ai Setup Guide

## ✅ Completed Automatically

1. **Storage Bucket Created** - The `chat-images` bucket has been created in Supabase with proper policies
2. **Database Schema** - All tables (profiles, messages, conversations) are set up with RLS policies
3. **Project Structure** - All code is implemented and ready

## 🔧 What You Need to Do

### 1. Set Up EAS Environment Variables

You have two options:

#### Option A: Use the Setup Script (Recommended)
```bash
cd afrikaner-ai
./scripts/setup-eas-secrets.sh
```

This script reads from your `.env.local` file and sets up all EAS secrets automatically.

#### Option B: Manual Setup
Run these commands (replace with your actual values):

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://rhtycldemmhoxrkeouvx.supabase.co" --scope project --type string
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --scope project --type string
eas env:create --name EXPO_PUBLIC_OPENAI_API_KEY --value "your-openai-key" --scope project --type string
```

**Optional (for error monitoring):**
```bash
eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value "your-sentry-dsn" --scope project --type string
```

### 2. Verify EAS Secrets

Check that all secrets are set:
```bash
eas env:list
```

### 3. Test the App Locally

```bash
npm start
# or
npx expo start
```

### 4. Build for Testing

```bash
# Preview build (internal distribution)
eas build --platform all --profile preview

# Production build (when ready)
eas build --platform all --profile production
```

## 📋 What I Need From You

For **question 2** (setting up EAS secrets):
- ✅ **Nothing!** The script will read from your `.env.local` file automatically
- Just run: `./scripts/setup-eas-secrets.sh`

For **question 3** (store submission):
- **Apple Developer Account** (for iOS):
  - Apple ID email
  - App Store Connect App ID
  - Apple Team ID
- **Google Play Console** (for Android):
  - Service account JSON key file
- **Store Assets**:
  - App icons (1024x1024)
  - Screenshots for both stores
  - App descriptions in Afrikaans

## 🚀 Quick Start

1. Make sure `.env.local` has all your keys
2. Run `./scripts/setup-eas-secrets.sh`
3. Test locally: `npm start`
4. Build preview: `eas build --platform all --profile preview`

## 📝 Notes

- The storage bucket `chat-images` is already created and configured
- All database migrations are applied
- The app is ready for testing and building
- See `RELEASE_CHECKLIST.md` for full release process

