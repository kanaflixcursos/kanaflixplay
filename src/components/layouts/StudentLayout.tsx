import { ReactNode, useEffect, useState } from 'react';
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
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Home, LogOut, Shield, User, Compass, GraduationCap } from 'lucide-react';
import logoKanaflix from '@/assets/logo-kanaflix.png';
import { supabase } from '@/integrations/supabase/client';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';

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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('user_id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
      if (data?.full_name) {
        setUserName(data.full_name);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

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

            {/* User Profile Section */}
            <div className="mt-auto">
              <Separator className="my-2" />
              <SidebarGroup>
                <SidebarGroupLabel>Conta</SidebarGroupLabel>
                <SidebarGroupContent>
                  {/* User Info */}
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{userName || 'Usuário'}</p>
                    </div>
                  </div>
                  
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/profile"
                          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <User className="h-4 w-4" />
                          <span>Meu Perfil</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/"
                          end
                          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <GraduationCap className="h-4 w-4" />
                          <span>Meus Cursos</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                  
                  {/* Theme Toggle */}
                  <div className="py-1">
                    <ThemeToggle />
                  </div>
                  
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full text-left text-destructive hover:bg-destructive/10"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sair</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <SidebarTrigger />
            <NotificationsDropdown />
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
