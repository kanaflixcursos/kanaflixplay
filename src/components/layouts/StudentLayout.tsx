import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import Footer from '@/components/Footer';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Home, LogOut, Shield, Compass, GraduationCap, Bell } from 'lucide-react';
import logoKanaflix from '@/assets/logo-kanaflix.png';
import { supabase } from '@/integrations/supabase/client';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Explorar', url: 'https://kanaflix.com.br/', icon: Compass, external: true },
];

interface StudentLayoutProps {
  children: ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, email')
        .eq('user_id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
      if (data?.full_name) {
        setUserName(data.full_name);
      }
      setUserEmail(data?.email || user?.email || null);
    };
    fetchProfile();
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('id, is_read')
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error && data) {
      setUnreadCount(data.length);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel('notifications-sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitials = userName 
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <SidebarProvider>
      <div className="mesh-gradient-bg" aria-hidden="true" />
      <div className="min-h-screen flex w-full relative">
        <Sidebar>
          <div className="p-4 border-b">
            <img src={logoKanaflix} alt="Kanaflix" className="h-8 w-auto" />
          </div>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        {'external' in item && item.external ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </a>
                        ) : (
                          <NavLink
                            to={item.url}
                            end={item.url === '/'}
                            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                            activeClassName="bg-accent text-accent-foreground font-medium"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            {role === 'admin' && (
              <SidebarGroup>
                <SidebarGroupLabel>Administração</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/admin"
                          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <Shield className="h-4 w-4" />
                          <span>Painel Admin</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          {/* User Section at Bottom - Unified with AdminLayout */}
          <SidebarFooter className="border-t p-4">
            {/* User Profile */}
            <button
              onClick={() => navigate('/profile')}
              className="sidebar-profile-btn"
            >
              <Avatar className="sidebar-profile-avatar">
                <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="sidebar-profile-name">{userName || 'Usuário'}</p>
                <p className="sidebar-profile-email">{userEmail}</p>
              </div>
            </button>

            <Separator className="my-2" />

            {/* Action Buttons */}
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-9 px-3"
                onClick={() => navigate('/')}
              >
                <GraduationCap className="h-4 w-4" />
                Meus Cursos
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-9 px-3 relative"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-4 w-4" />
                Notificações
                {unreadCount > 0 && (
                  <span className="absolute right-2 h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sair da Conta
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <SidebarTrigger />
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
