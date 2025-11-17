import { config as loadEnv } from "dotenv";
import { ConfigContext, ExpoConfig } from "expo/config";

// Load environment variables silently (suppress verbose output)
try {
  loadEnv({ path: ".env" });
  loadEnv({ path: ".env.local", override: true });
} catch (error) {
  // Silently handle missing .env files
}

const APP_NAME = "Afrikaner.ai";
const APP_SLUG = "afrikanerai";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: APP_SLUG,
  owner: "pieterbothma2",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  scheme: "afrikanerai",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.pieterbothma2.afrikanerai",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router", "expo-font"],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null,
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? null,
    eas: {
      projectId: "de032f60-0401-46f3-be4e-215cd75a255c",
    },
  },
});
