import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
import { NavLink } from '@/components/NavLink';
import SidebarLogo from '@/components/SidebarLogo';
import SidebarProfileBox from '@/components/SidebarProfileBox';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeft,
  ShoppingCart,
  HelpCircle,
  Home,
  Shield,
  Compass,
  GraduationCap,
  ShoppingBag,
  Star,
} from 'lucide-react';

const studentMenuItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Cursos', url: '/courses', icon: GraduationCap },
  { title: 'Compras', url: '/purchases', icon: ShoppingBag },
  { title: 'Suporte', url: '/suporte', icon: HelpCircle },
  { title: 'Explorar', url: 'https://kanaflix.com.br/', icon: Compass, external: true },
];

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Cursos', url: '/admin/courses', icon: BookOpen },
  { title: 'Alunos', url: '/admin/students', icon: Users },
  { title: 'Compras', url: '/admin/orders', icon: ShoppingCart },
  { title: 'Banner Destaque', url: '/admin/featured-banner', icon: Star },
  { title: 'Suporte', url: '/admin/suporte', icon: HelpCircle },
];

interface AppSidebarProps {
  variant: 'student' | 'admin';
}

export default function AppSidebar({ variant }: AppSidebarProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; email: string | null }>({
    full_name: null,
    avatar_url: null,
    email: null,
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = variant === 'admin';
  const menuItems = isAdmin ? adminMenuItems : studentMenuItems;

  const { unreadCount: pendingSupportCount } = useSupportNotifications({
    userId: user?.id,
    isAdmin,
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, email')
        .eq('user_id', user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchUnreadNotifications();
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${variant}-sidebar`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchUnreadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadNotifications, variant]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userName = profile.full_name || (isAdmin ? 'Administrador' : 'Usuário');
  const userEmail = profile.email || user?.email || '';
  const homeUrl = isAdmin ? '/' : '/admin';
  const homeEnd = isAdmin ? '/admin' : '/';

  return (
    <Sidebar variant="sidebar">
      <SidebarLogo showAdminBadge={isAdmin} />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? 'Gerenciamento' : 'Menu'}</SidebarGroupLabel>
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
                        className="flex items-center gap-3 px-6 py-5 rounded-md text-[15px]"
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span>{item.title}</span>
                      </a>
                    ) : (
                      <NavLink
                        to={item.url}
                        end={item.url === homeEnd}
                        className="flex items-center gap-3 px-6 py-5 rounded-md text-[15px]"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="flex-1">{item.title}</span>
                        {item.title === 'Suporte' && pendingSupportCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                            {pendingSupportCount}
                          </span>
                        )}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin: link to go back to LMS / Student: link to admin panel */}
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/"
                      className="flex items-center gap-3 px-6 py-5 rounded-md text-[15px]"
                    >
                      <ArrowLeft className="h-[18px] w-[18px]" />
                      <span>Voltar ao LMS</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : role === 'admin' ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-3 px-6 py-5 rounded-md text-[15px]"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <Shield className="h-[18px] w-[18px]" />
                      <span>Painel Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <SidebarProfileBox
          userName={userName}
          userEmail={userEmail}
          avatarUrl={profile.avatar_url}
          unreadCount={unreadCount}
          onSignOut={handleSignOut}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
