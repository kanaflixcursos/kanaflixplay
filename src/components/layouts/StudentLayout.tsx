import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
import { NavLink } from '@/components/NavLink';
import Footer from '@/components/Footer';
import SidebarLogo from '@/components/SidebarLogo';
import SidebarProfileBox from '@/components/SidebarProfileBox';
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
  SidebarFooter } from
'@/components/ui/sidebar';
import { Home, Shield, Compass, GraduationCap, ShoppingBag, HelpCircle } from 'lucide-react';

const menuItems = [
{ title: 'Dashboard', url: '/', icon: Home },
{ title: 'Cursos', url: '/courses', icon: GraduationCap },
{ title: 'Compras', url: '/purchases', icon: ShoppingBag },
{ title: 'Suporte', url: '/suporte', icon: HelpCircle },
{ title: 'Explorar', url: 'https://kanaflix.com.br/', icon: Compass, external: true }];


interface StudentLayoutProps {
  children: ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Use the unified support notifications hook
  const { unreadCount: unreadSupportNotifications } = useSupportNotifications({
    userId: user?.id,
    isAdmin: false
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase.
      from('profiles').
      select('avatar_url, full_name, email').
      eq('user_id', user.id).
      single();

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

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (!user) return;

      const { count } = await supabase.
      from('notifications').
      select('*', { count: 'exact', head: true }).
      eq('user_id', user.id).
      eq('is_read', false);

      setUnreadNotificationCount(count || 0);
    };

    fetchUnreadNotifications();

    if (!user) return;

    const channel = supabase.
    channel('notifications-student-sidebar').
    on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      },
      () => {
        fetchUnreadNotifications();
      }
    ).
    subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = userName || 'Usuário';
  const displayEmail = userEmail || '';

  return (
    <SidebarProvider>
      <div className="mesh-gradient-bg" aria-hidden="true" />
      <div className="min-h-screen flex w-full mx-auto relative">
        <Sidebar variant="floating">
          <SidebarLogo />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) =>
                  <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        {'external' in item && item.external ?
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors">

                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </a> :

                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                        activeClassName="bg-accent text-accent-foreground font-medium">

                            <item.icon className="h-4 w-4" />
                            <span className="flex-1">{item.title}</span>
                            {item.title === 'Suporte' && unreadSupportNotifications > 0 &&
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                                {unreadSupportNotifications}
                              </span>
                        }
                          </NavLink>
                      }
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            {role === 'admin' &&
            <SidebarGroup>
                <SidebarGroupLabel>Administração</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                        to="/admin"
                        className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                        activeClassName="bg-accent text-accent-foreground font-medium">

                          <Shield className="h-4 w-4" />
                          <span>Painel Admin</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            }
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <SidebarProfileBox
              userName={displayName}
              userEmail={displayEmail}
              avatarUrl={avatarUrl}
              unreadCount={unreadNotificationCount}
              onSignOut={handleSignOut} />

          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <SidebarTrigger />
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <div className="max-w-[1000px] mx-auto w-full">
              {children}
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </SidebarProvider>);

}