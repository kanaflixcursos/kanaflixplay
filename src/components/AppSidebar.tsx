import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeft,
  ShoppingCart,
  Home,
  Shield,
  Compass,
  GraduationCap,
  ShoppingBag,
  Star,
  Megaphone,
  Trophy,
  Wallet,
  Settings,
  UserPlus,
} from 'lucide-react';

const studentMenuItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Cursos', url: '/courses', icon: GraduationCap },
  { title: 'Meus Pontos', url: '/points', icon: Trophy },
  { title: 'Compras', url: '/purchases', icon: ShoppingBag },
  { title: 'Explorar', url: '/catalog', icon: Compass },
];

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Criadores', url: '/admin/creators', icon: UserPlus },
  { title: 'Cursos', url: '/admin/courses', icon: BookOpen },
  { title: 'Alunos', url: '/admin/students', icon: Users },
  { title: 'Vendas', url: '/admin/orders', icon: ShoppingCart },
  { title: 'Carteira', url: '/admin/wallet', icon: Wallet },
  { title: 'Banner Destaque', url: '/admin/featured-banner', icon: Star },
  { title: 'Marketing', url: '/admin/marketing', icon: Megaphone },
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
];

const creatorMenuItems = [
  { title: 'Dashboard', url: '/creator', icon: LayoutDashboard },
  { title: 'Cursos', url: '/creator/courses', icon: BookOpen },
  { title: 'Alunos', url: '/creator/students', icon: Users },
  { title: 'Vendas', url: '/creator/orders', icon: ShoppingCart },
  { title: 'Configurações', url: '/creator/settings', icon: Settings },
];

interface AppSidebarProps {
  variant: 'student' | 'admin' | 'creator';
}

export default function AppSidebar({ variant }: AppSidebarProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; email: string | null }>({
    full_name: null,
    avatar_url: null,
    email: null,
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = variant === 'admin';
  const isCreator = variant === 'creator';
  const menuItems = isAdmin ? adminMenuItems : isCreator ? creatorMenuItems : studentMenuItems;

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

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
  const homeEnd = isAdmin ? '/admin' : '/';

  return (
    <Sidebar variant="sidebar">
      <SidebarLogo showAdminBadge={isAdmin} />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === homeEnd}
                      className="flex items-center gap-3 px-6 py-5 rounded-md text-sm"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4.5 w-4.5" />
                      <span className="flex-1">{item.title}</span>
                    </NavLink>
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
                      className="flex items-center gap-3 px-6 py-5 rounded-md text-sm"
                    >
                      <ArrowLeft className="h-4.5 w-4.5" />
                      <span>Voltar ao LMS</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : role === 'admin' ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-3 px-6 py-5 rounded-md text-sm"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <Shield className="h-4.5 w-4.5" />
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