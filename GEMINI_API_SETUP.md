# Gemini API Key Verification Guide

## Quick Check

1. **Verify API key is in `.env.local`:**
   ```bash
   cat .env.local | grep GEMINI
   ```
   Should show: `EXPO_PUBLIC_GEMINI_API_KEY=AIza...`

2. **Test the API key directly:**
   ```bash
   node scripts/check-gemini-key.js
   ```

3. **Check in Expo console:**
   When you run the app, look for these debug logs:
   - `[Gemini Debug] API key aanwesig: AIzaSyDvcs...`
   - `[Gemini Debug] Endpoint: https://generativelanguage.googleapis.com/...`
   - `[Gemini Debug] Response status: 200` (if successful)

## Common Issues

### 1. API Key Not Found
**Symptom:** `Gemini API key ontbreek` warning in console

**Fix:**
- Make sure `.env.local` exists in the `afrikaner-ai` folder
- Restart Expo/Metro bundler after adding the key
- Use `npx expo start --clear` to clear cache

### 2. Invalid API Key
**Symptom:** `401 Unauthorized` or `403 Forbidden` errors

**Fix:**
- Get a new API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Make sure the key starts with `AIza`
- Verify the key has not been restricted (check API restrictions in Google Cloud Console)

### 3. Model Not Found (404)
**Symptom:** `models/gemini-2.0-flash-exp is not found`

**Fix:**
- The model name might be incorrect
- Try changing to `gemini-1.5-flash` (stable) in `src/lib/openai.ts`
- Check [Google's model list](https://ai.google.dev/models/gemini) for available models

### 4. Cannot Parse Response
**Symptom:** `fetch failed: cannot parse response`

**Possible causes:**
- API key is invalid (returns HTML error page instead of JSON)
- Network issue
- API quota exceeded

**Fix:**
- Check the debug logs to see the actual response
- Verify API key is correct
- Check Google Cloud Console for quota limits

## Where to Get/Verify Your API Key

1. **Get a new key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click "Create API Key"
   - Copy the key (starts with `AIza`)

2. **Verify existing key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "Credentials"
   - Find your API key and check:
     - Status (should be enabled)
     - Restrictions (should allow Generative Language API)
     - Quota/Usage limits

3. **Test the key manually:**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'
   ```

## Current Configuration

- **Model:** `gemini-2.0-flash-exp` (experimental)
- **Alternative:** `gemini-1.5-flash` (stable, if 2.0 doesn't work)
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent`
- **API Key Location:** `.env.local` → `EXPO_PUBLIC_GEMINI_API_KEY`

## Debugging Steps

1. Check console logs for `[Gemini Debug]` messages
2. Run the test script: `node scripts/check-gemini-key.js`
3. Verify `.env.local` has the correct key
4. Restart Expo with cache clear: `npx expo start --clear`
5. Check Google Cloud Console for API key status

