import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_PATH = '/auth/callback';

export async function signInWithProvider(provider: 'google' | 'apple') {
  const redirectTo = makeRedirectUri({
    scheme: 'afrikanerai',
    path: REDIRECT_PATH,
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Aanmeldingsproses gekanselleer.');
    }
  }

  // Refresh user store after OAuth completes
  await useUserStore.getState().hydrateFromSupabaseSession();
}

