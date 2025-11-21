# Icon Mapping Guide

## Your Current Files → Expo Requirements

Upload your files to `afrikaner-ai/assets/branding/` and use this mapping:

### For Expo App:
1. **`icon.png`** (1024x1024px)
   - Use: `android-chrome-512x512.png` (resize to 1024x1024 if needed)
   - Or: `apple-touch-icon.png` (if it's 1024x1024 or larger)

2. **`adaptive-icon.png`** (1024x1024px, foreground only)
   - Use: `android-chrome-512x512.png` (resize to 1024x1024 if needed)
   - This should be just the icon/logo without background

3. **`splash-icon.png`** (any size, will be centered)
   - Use: `apple-touch-icon.png` or your main logo
   - This appears centered on the splash screen

4. **`favicon.png`** (for web)
   - Use: `favicon-32x32.png` or `favicon.ico` (convert to PNG)

### Quick Setup:
Once you upload your files to `assets/branding/`, I can:
1. Copy/rename them to the correct locations
2. Update `app.config.ts` to use your new assets
3. Update splash screen background to match your dark theme (#1A1A1A)

**Note:** The `site.webmanifest` file is web-specific and won't be used by Expo, but you can keep it for future web deployment.
