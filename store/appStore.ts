import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ONBOARDING_KEY = 'koedoe.hasSeenOnboarding';

type AppStore = {
  hasSeenOnboarding: boolean | null;
  hydrateOnboarding: () => Promise<boolean>;
  setHasSeenOnboardingFlag: (value: boolean) => Promise<void>;
  resetOnboardingFlag: () => Promise<void>;
};

export const useAppStore = create<AppStore>((set) => ({
  hasSeenOnboarding: null,
  hydrateOnboarding: async () => {
    try {
      const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
      const hasSeen = stored === 'true';
      set({ hasSeenOnboarding: hasSeen });
      return hasSeen;
    } catch (error) {
      console.warn('Kon nie onboarding-vlag lees nie:', error);
      set({ hasSeenOnboarding: false });
      return false;
    }
  },
  setHasSeenOnboardingFlag: async (value: boolean) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.warn('Kon nie onboarding-vlag stoor nie:', error);
    } finally {
      set({ hasSeenOnboarding: value });
    }
  },
  resetOnboardingFlag: async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (error) {
      console.warn('Kon nie onboarding-vlag herstel nie:', error);
    } finally {
      set({ hasSeenOnboarding: false });
    }
  },
}));

export { ONBOARDING_KEY };

