import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Preserve full original URL (path + search params including UTMs) as redirect
    const currentUrl = location.pathname + location.search;
    const loginUrl = currentUrl !== '/' 
      ? `/login?redirect=${encodeURIComponent(currentUrl)}`
      : '/login';
    return <Navigate to={loginUrl} replace />;
  }

  // Redirect imported users to onboarding
  if (user.user_metadata?.needs_onboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
