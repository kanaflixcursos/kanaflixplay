import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';
import Footer from '@/components/Footer';
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
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { LayoutDashboard, BookOpen, Users, ArrowLeft, ShoppingCart } from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Cursos', url: '/admin/courses', icon: BookOpen },
  { title: 'Alunos', url: '/admin/students', icon: Users },
  { title: 'Compras', url: '/admin/orders', icon: ShoppingCart },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; email: string | null }>({
    full_name: null,
    avatar_url: null,
    email: null,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [ticketsWithUnreadMessages, setTicketsWithUnreadMessages] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    setUnreadCount(count || 0);
  }, [user]);

  const fetchTicketsWithUnreadMessages = useCallback(async () => {
    // Get all open/in_progress tickets
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id')
      .in('status', ['open', 'in_progress']);

    if (!tickets || tickets.length === 0) {
      setTicketsWithUnreadMessages([]);
      return;
    }

    const ticketIds = tickets.map(t => t.id);
    
    // For each ticket, check if the last message is from user (not admin)
    const { data: messages } = await supabase
      .from('support_ticket_messages')
      .select('ticket_id, is_admin_reply, created_at')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: false });

    // Group by ticket and get the last message
    const lastMessageByTicket = new Map<string, boolean>();
    (messages || []).forEach(m => {
      if (!lastMessageByTicket.has(m.ticket_id)) {
        lastMessageByTicket.set(m.ticket_id, m.is_admin_reply);
      }
    });

    // Tickets where last message is NOT from admin (user replied and waiting for admin response)
    const ticketsNeedingAttention = ticketIds.filter(id => {
      const lastIsAdmin = lastMessageByTicket.get(id);
      // If no messages or last message is from user, it needs attention
      return lastIsAdmin === false || lastIsAdmin === undefined;
    });

    setTicketsWithUnreadMessages(ticketsNeedingAttention);
  }, []);

  useEffect(() => {
    fetchUnreadNotifications();
    fetchTicketsWithUnreadMessages();

    if (!user) return;

    const notificationsChannel = supabase
      .channel('notifications-admin-sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    const ticketsChannel = supabase
      .channel('tickets-admin-sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTicketsWithUnreadMessages();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-admin-sidebar')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
        },
        () => {
          fetchTicketsWithUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, fetchUnreadNotifications, fetchTicketsWithUnreadMessages]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userName = profile.full_name || 'Administrador';
  const userEmail = profile.email || user?.email || '';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarLogo showAdminBadge />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Gerenciamento</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/admin'}
                          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Voltar ao LMS</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <SidebarProfileBox
              userName={userName}
              userEmail={userEmail}
              avatarUrl={profile.avatar_url}
              unreadCount={unreadCount}
              pendingSupportCount={ticketsWithUnreadMessages.length}
              onSignOut={handleSignOut}
              variant="admin"
            />
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <SidebarTrigger />
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto bg-background">
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
