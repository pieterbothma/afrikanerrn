# QA Checklist for App Store Submission

## Pre-Build Checks

### Environment & Configuration
- [ ] All environment variables set in EAS secrets (not in code)
- [ ] `.env.local` is gitignored and not committed
- [ ] `app.config.ts` version number updated
- [ ] Bundle identifier matches App Store Connect / Google Play Console
- [ ] App name and slug are correct

### Code Quality
- [ ] No linter errors: `npm run lint` (if configured)
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] No console.log statements with sensitive data
- [ ] Error handling is in place for all API calls
- [ ] Loading states shown for async operations

## Feature Testing

### Authentication
- [ ] User can register with email/password
- [ ] User can login with existing account
- [ ] User can reset forgotten password
- [ ] User can logout successfully
- [ ] Session persists after app restart
- [ ] User redirected to login when not authenticated

### Chat Functionality
- [ ] User can send text messages
- [ ] AI responds in Afrikaans
- [ ] Messages are saved and persist
- [ ] Conversation history loads correctly
- [ ] User can start new conversation
- [ ] User can delete conversations
- [ ] Empty state displays correctly
- [ ] Prompt cards work correctly
- [ ] Chat scrolls to bottom on new messages

### Image Features
- [ ] User can take photo with camera
- [ ] User can select image from gallery
- [ ] User can generate AI images
- [ ] User can edit images
- [ ] Image uploads work correctly
- [ ] Images display in chat
- [ ] Usage limits enforced for image generation
- [ ] Usage limits enforced for image editing
- [ ] Error messages shown for failed image operations

### Usage Limits & Subscriptions
- [ ] Free tier limits enforced (40 chats, 3 image gen, 3 image edit)
- [ ] Usage counter updates correctly
- [ ] Warning shown at 80% of limit
- [ ] Block shown at 100% of limit
- [ ] Subscription screen displays correctly
- [ ] Premium plans show correct pricing
- [ ] Purchase flow works (test with sandbox)
- [ ] Restore purchases works
- [ ] Subscription status syncs correctly
- [ ] Premium limits apply after subscription

### Settings
- [ ] User can update display name
- [ ] User can change tone preset (formeel/informeel/vriendelik)
- [ ] User can upload avatar
- [ ] Usage statistics display correctly
- [ ] Subscription tier displays correctly
- [ ] Settings persist after app restart

### Categories Screen
- [ ] Categories display correctly
- [ ] Category cards are clickable
- [ ] Navigation works correctly

### Menu Drawer
- [ ] Drawer opens and closes smoothly
- [ ] Conversation list displays correctly
- [ ] User can select conversation
- [ ] User can edit conversation title
- [ ] User can delete conversation
- [ ] Categories section displays correctly

## Platform-Specific Testing

### iOS
- [ ] App runs on iOS 15.0+
- [ ] Camera permission requested correctly
- [ ] Photo library permission requested correctly
- [ ] App handles permission denial gracefully
- [ ] Keyboard behavior is correct
- [ ] Safe area insets work correctly
- [ ] Tab bar displays correctly
- [ ] Status bar styling is correct
- [ ] App doesn't crash on background/foreground

### Android
- [ ] App runs on Android 8.0+ (API 26+)
- [ ] Camera permission requested correctly
- [ ] Storage permission requested correctly
- [ ] App handles permission denial gracefully
- [ ] Back button behavior is correct
- [ ] Keyboard behavior is correct
- [ ] Status bar styling is correct
- [ ] App doesn't crash on background/foreground

## Error Handling

- [ ] Network errors handled gracefully
- [ ] API errors show user-friendly messages
- [ ] Offline state handled (if applicable)
- [ ] Invalid inputs rejected with clear messages
- [ ] Rate limiting errors handled
- [ ] Subscription errors handled
- [ ] Image generation errors handled
- [ ] Image upload errors handled

## Performance

- [ ] App starts quickly (< 3 seconds)
- [ ] Chat messages load quickly
- [ ] Images load and display smoothly
- [ ] No memory leaks (test extended use)
- [ ] App doesn't freeze during operations
- [ ] Smooth scrolling in lists

## Security

- [ ] No API keys in code or logs
- [ ] RLS policies working correctly
- [ ] Users can only access their own data
- [ ] Storage bucket policies correct
- [ ] Authentication tokens handled securely
- [ ] Sensitive data not logged

## Store Requirements

### App Store (iOS)
- [ ] Privacy policy URL provided
- [ ] Support URL provided
- [ ] App description in Afrikaans
- [ ] Screenshots prepared (all required sizes)
- [ ] App icon (1024x1024)
- [ ] Age rating appropriate
- [ ] In-App Purchase products configured
- [ ] Subscription groups configured

### Google Play (Android)
- [ ] Privacy policy URL provided
- [ ] Support email provided
- [ ] App description in Afrikaans
- [ ] Screenshots prepared (all required sizes)
- [ ] Feature graphic (1024x500)
- [ ] App icon (512x512)
- [ ] Content rating completed
- [ ] In-App Purchase products configured

## Build & Submission

- [ ] Production build succeeds: `eas build --platform all --profile production`
- [ ] Build artifacts uploaded successfully
- [ ] App installs and runs on test devices
- [ ] No crashes in first 5 minutes of use
- [ ] All critical features work in production build
- [ ] Submit to App Store: `eas submit --platform ios`
- [ ] Submit to Google Play: `eas submit --platform android`

## Post-Submission

- [ ] Monitor Sentry for errors
- [ ] Check App Store Connect for review status
- [ ] Check Google Play Console for review status
- [ ] Respond to any review feedback promptly
- [ ] Monitor analytics after release

## Known Issues & Limitations

Document any known issues that don't block release:

- [ ] List known issues here
- [ ] Document workarounds if any

## Test Matrix

| Feature | iOS | Android | Notes |
|---------|-----|---------|-------|
| Chat | ✅ | ✅ | |
| Image Gen | ✅ | ✅ | |
| Image Edit | ✅ | ✅ | |
| Subscriptions | ✅ | ✅ | Requires sandbox testing |
| Usage Limits | ✅ | ✅ | |
| Settings | ✅ | ✅ | |

## Sign-off

- [ ] All critical features tested and working
- [ ] No blocking bugs found
- [ ] Security audit passed
- [ ] Ready for store submission

**Tested by:** _________________  
**Date:** _________________  
**Build Version:** _________________

