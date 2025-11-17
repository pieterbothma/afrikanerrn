import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

export type UserProfile = {
  id: string;
  email: string | null;
  displayName?: string | null;
  tonePreset?: 'formeel' | 'informeel' | 'vriendelik';
};

type UserStore = {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  hydrateFromSupabaseSession: () => Promise<UserProfile | null>;
};

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  hydrateFromSupabaseSession: async () => {
    const { data: sessionData, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Kon nie Supabase sessie verkry nie:', error.message);
      set({ user: null });
      return null;
    }

    const sessionUser = sessionData.session?.user;

    if (!sessionUser) {
      set({ user: null });
      return null;
    }

    let displayName: string | null = sessionUser.user_metadata?.display_name ?? null;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('display_name, tone_preset')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (profileData?.display_name) {
      displayName = profileData.display_name;
    }

    const profile: UserProfile = {
      id: sessionUser.id,
      email: sessionUser.email ?? null,
      displayName,
      tonePreset: (profileData?.tone_preset as 'formeel' | 'informeel' | 'vriendelik') || 'informeel',
    };

    set({ user: profile });

    return profile;
  },
}));

