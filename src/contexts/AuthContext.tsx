import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getStoredUtm } from '@/lib/utm';
import { getVisitorId, linkVisitorToUser, trackEvent } from '@/hooks/useTrackEvent';
import { getProductionUrl } from '@/hooks/useSiteSettings';

type UserRole = 'admin' | 'student' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  profileComplete: boolean | null;
  recheckProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, redirectTo?: string, phone?: string, birthDate?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (!error && data) {
      setRole(data.role as UserRole);
    }
  };

  const checkProfileComplete = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('phone, birth_date')
      .eq('user_id', userId)
      .single();
    
    const complete = !!(data?.phone && data?.birth_date);
    setProfileComplete(complete);
  };

  const recheckProfile = async () => {
    if (user) {
      await checkProfileComplete(user.id);
    }
  };

  const updateLastSeen = async (userId: string) => {
    const utm = getStoredUtm();
    const updateData: Record<string, string> = { last_seen_at: new Date().toISOString() };
    
    // First-touch UTM attribution: only set if profile doesn't have UTM yet
    if (utm.utm_source) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('utm_source')
        .eq('user_id', userId)
        .single();
      
      if (!profile?.utm_source) {
        updateData.utm_source = utm.utm_source;
        if (utm.utm_medium) updateData.utm_medium = utm.utm_medium;
        if (utm.utm_campaign) updateData.utm_campaign = utm.utm_campaign;
      }
    }
    
    await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId);

    // Award daily login points (+5)
    await (supabase.rpc as any)('award_daily_login_points', { p_user_id: userId });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => fetchUserRole(session.user.id), 0);
          setTimeout(() => checkProfileComplete(session.user.id), 0);
          setTimeout(() => updateLastSeen(session.user.id), 0);
          
          // Link anonymous journey events to this authenticated user
          if (event === 'SIGNED_IN') {
            const visitorId = getVisitorId();
            setTimeout(() => linkVisitorToUser(visitorId, session.user.id), 0);

            // Track signup event for new users (created within last 60 seconds)
            const createdAt = new Date(session.user.created_at).getTime();
            const now = Date.now();
            if (now - createdAt < 60_000) {
              setTimeout(() => trackEvent('signup', {}, undefined, session.user.id), 0);
            }

            const redirectAfterConfirm = localStorage.getItem('kanaflix_redirect_after_confirm');
            if (redirectAfterConfirm) {
              localStorage.removeItem('kanaflix_redirect_after_confirm');
              setTimeout(() => {
                window.location.href = redirectAfterConfirm;
              }, 100);
            }
          }
        } else {
          setRole(null);
          setProfileComplete(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        checkProfileComplete(session.user.id);
        updateLastSeen(session.user.id);
        const visitorId = getVisitorId();
        linkVisitorToUser(visitorId, session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, redirectTo?: string, phone?: string, birthDate?: string) => {
    // Check if email already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile) {
      return { error: new Error('Este email já está cadastrado. Tente fazer login.') };
    }

    // Use the published URL for email confirmation redirect
    const baseUrl = await getProductionUrl();
    
    // If there's a custom redirect, include it in the email link
    const emailRedirectUrl = redirectTo && redirectTo !== '/' 
      ? `${baseUrl}${redirectTo}`
      : baseUrl;
    
    // Include UTM params in user metadata so the DB trigger can save them to profile
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
        emailRedirectTo: emailRedirectUrl,
      },
    });

    // Supabase returns a user with identities = [] if email already exists
    if (data?.user && data.user.identities?.length === 0) {
      return { error: new Error('Este email já está cadastrado. Tente fazer login.') };
    }

    // Phone and birth_date are now handled by the handle_new_user DB trigger
    // which extracts them from raw_user_meta_data, so no need to update profile here

    // Signup no longer tracked as separate event — lead_captured handles attribution

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfileComplete(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, profileComplete, recheckProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
