import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { trackEvent } from '@/hooks/useTrackEvent';
import { authService, SignUpData } from '@/features/auth/services/authService';
import { userService } from '@/features/auth/services/userService';
import { AuthContextType, User, Session, UserRole } from '@/features/auth/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const handleAuthChange = useCallback(async (event: string, session: Session | null) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      // Fetch role and profile status in parallel
      const [userRole, isProfileComplete] = await Promise.all([
        userService.getUserRole(currentUser.id),
        userService.isProfileComplete(currentUser.id),
      ]);
      
      setRole(userRole);
      setProfileComplete(isProfileComplete);

      // Update last seen in the background
      userService.updateLastSeen(currentUser.id);
      
      if (event === 'SIGNED_IN') {
        trackEvent('login', {}, '/login', currentUser.id);
        const redirectAfterConfirm = localStorage.getItem('kanaflix_redirect_after_confirm');
        if (redirectAfterConfirm) {
          localStorage.removeItem('kanaflix_redirect_after_confirm');
          // Use a short delay to ensure state has propagated before redirect
          setTimeout(() => { window.location.href = redirectAfterConfirm; }, 100);
        }
      }
    } else {
      setRole(null);
      setProfileComplete(null);
    }
    setLoading(false);
  }, []);

  const recheckProfile = useCallback(async () => {
    if (user) {
      const isComplete = await userService.isProfileComplete(user.id);
      setProfileComplete(isComplete);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    // State will be cleared by onAuthStateChange listener
  }, []);

  useEffect(() => {
    // Immediately check the session on mount
    authService.getSession().then(session => {
        handleAuthChange('INITIAL_SESSION', session);
    }).catch(error => {
        console.error("Error getting initial session:", error);
        setLoading(false);
    });

    // Listen for future auth state changes
    const subscription = authService.onAuthStateChange((event, session) => {
        // Avoid re-processing the initial session event if it's fired again by the listener
        if (event !== 'INITIAL_SESSION') {
            handleAuthChange(event, session);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthChange]);

  const value = {
    user,
    session,
    role,
    loading,
    profileComplete,
    recheckProfile,
    // The context will no longer expose signIn and signUp directly
    // Components should use the service or a dedicated hook
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
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
