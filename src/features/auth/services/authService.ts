import { supabase } from '@/lib/supabase';
import { getStoredUtm, clearStoredUtm } from '@/lib/utm';

export type SignUpData = {
  email: string;
  password: string;
  fullName: string;
  redirectTo?: string;
  phone?: string;
  birthDate?: string;
};

// Note: The original `signUp` logic had a check for existing profiles.
// This is good, but it couples the auth service with the profile service.
// For this refactor, we'll keep it here, but a future improvement could be
// to move this check into a higher-level hook that uses both services.

export const authService = {
  async signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return null;
  },

  async signUp({ email, password, fullName, redirectTo, phone, birthDate }: SignUpData) {
    // Check if email already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile) {
      throw new Error('Este email já está cadastrado. Tente fazer login.');
    }

    const baseUrl = import.meta.env.PROD
      ? 'https://cursos.kanaflix.com.br'
      : window.location.origin;

    const emailRedirectTo = redirectTo && redirectTo !== '/'
      ? `${baseUrl}${redirectTo}`
      : baseUrl;

    const utm = getStoredUtm();
    const userData: Record<string, string | undefined> = { full_name: fullName, phone, birth_date: birthDate };
    if (utm.utm_source) userData.utm_source = utm.utm_source;
    if (utm.utm_medium) userData.utm_medium = utm.utm_medium;
    if (utm.utm_campaign) userData.utm_campaign = utm.utm_campaign;

    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: userData,
        emailRedirectTo,
      },
    });

    if (error) {
      throw error;
    }

    // Supabase returns a user with identities = [] if email already exists
    if (data?.user && data.user.identities?.length === 0) {
      throw new Error('Este email já está cadastrado. Tente fazer login.');
    }

    // Clear UTMs after signup since they're now in user metadata
    if (data.user && utm.utm_source) {
      clearStoredUtm();
    }

    return data.user;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  onAuthStateChange(callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
};
