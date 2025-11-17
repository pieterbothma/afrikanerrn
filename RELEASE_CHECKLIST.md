# Release Checklist

## Pre-Release

- [ ] Update version in `app.config.ts`
- [ ] Update changelog
- [ ] Run `npx expo-doctor` to verify project health
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Verify all environment variables are set in EAS secrets
- [ ] Run production build locally: `eas build --platform all --profile production`

## Assets

- [ ] App icon (1024x1024) updated in `assets/icon.png`
- [ ] Splash screen updated in `assets/splash-icon.png`
- [ ] Adaptive icons for Android
- [ ] App Store screenshots prepared
- [ ] Google Play screenshots prepared

## Store Listings

### App Store (iOS)
- [ ] App name: Afrikaner.ai
- [ ] Subtitle: Moderne Afrikaanse AI-assistent
- [ ] Description in Afrikaans
- [ ] Keywords: afrikaans, ai, chat, assistant, taal
- [ ] Privacy policy URL
- [ ] Support URL

### Google Play (Android)
- [ ] App name: Afrikaner.ai
- [ ] Short description: Moderne Afrikaanse AI-assistent
- [ ] Full description in Afrikaans
- [ ] Feature graphic (1024x500)
- [ ] Privacy policy URL

## Build & Submit

- [ ] Run `eas build --platform ios --profile production`
- [ ] Run `eas build --platform android --profile production`
- [ ] Submit to App Store: `eas submit --platform ios`
- [ ] Submit to Google Play: `eas submit --platform android`

## Post-Release

- [ ] Monitor Sentry for errors
- [ ] Check analytics
- [ ] Announce release

