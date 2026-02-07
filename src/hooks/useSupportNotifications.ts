import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TicketWithUnread {
  ticketId: string;
  hasUnread: boolean;
}

interface UseSupportNotificationsOptions {
  userId: string | undefined;
  isAdmin: boolean;
}

interface UseSupportNotificationsReturn {
  unreadTicketIds: string[];
  unreadCount: number;
  markTicketAsRead: (ticketId: string) => Promise<void>;
  refreshUnreadState: () => void;
}

/**
 * Hook to manage support ticket read/unread state.
 * 
 * For ADMIN: A ticket is "unread" if the last message is from the user (not admin)
 * For STUDENT: A ticket is "unread" if the last message is from admin AND they haven't read it
 */
export function useSupportNotifications({
  userId,
  isAdmin,
}: UseSupportNotificationsOptions): UseSupportNotificationsReturn {
  const [unreadTicketIds, setUnreadTicketIds] = useState<string[]>([]);

  const fetchUnreadState = useCallback(async () => {
    if (!userId) {
      setUnreadTicketIds([]);
      return;
    }

    try {
      if (isAdmin) {
        // ADMIN logic: tickets where last message is from user (not admin) and ticket is open/in_progress
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id')
          .in('status', ['open', 'in_progress']);

        if (!tickets || tickets.length === 0) {
          setUnreadTicketIds([]);
          return;
        }

        const ticketIds = tickets.map(t => t.id);

        // Get latest message per ticket
        const { data: messages } = await supabase
          .from('support_ticket_messages')
          .select('ticket_id, is_admin_reply, created_at')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: false });

        // Find last message for each ticket
        const lastMessageByTicket = new Map<string, boolean>();
        (messages || []).forEach(m => {
          if (!lastMessageByTicket.has(m.ticket_id)) {
            lastMessageByTicket.set(m.ticket_id, m.is_admin_reply);
          }
        });

        // Tickets where last message is NOT from admin
        const unread = ticketIds.filter(id => {
          const lastIsAdmin = lastMessageByTicket.get(id);
          return lastIsAdmin === false || lastIsAdmin === undefined;
        });

        setUnreadTicketIds(unread);
      } else {
        // STUDENT logic: tickets where there's an admin reply AFTER their last read
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('user_id', userId)
          .in('status', ['open', 'in_progress', 'resolved']);

        if (!tickets || tickets.length === 0) {
          setUnreadTicketIds([]);
          return;
        }

        const ticketIds = tickets.map(t => t.id);

        // Get user's last read timestamps
        const { data: reads } = await supabase
          .from('support_ticket_reads')
          .select('ticket_id, last_read_at')
          .eq('user_id', userId)
          .in('ticket_id', ticketIds);

        const lastReadMap = new Map<string, string>(
          (reads || []).map(r => [r.ticket_id, r.last_read_at])
        );

        // Get admin messages
        const { data: adminMessages } = await supabase
          .from('support_ticket_messages')
          .select('ticket_id, created_at')
          .in('ticket_id', ticketIds)
          .eq('is_admin_reply', true)
          .order('created_at', { ascending: false });

        // Find tickets with admin messages after last read
        const ticketsWithUnreadAdminReplies: string[] = [];
        const processedTickets = new Set<string>();

        (adminMessages || []).forEach(m => {
          if (processedTickets.has(m.ticket_id)) return;
          processedTickets.add(m.ticket_id);

          const lastRead = lastReadMap.get(m.ticket_id);
          // If never read, or last admin message is after last read
          if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
            ticketsWithUnreadAdminReplies.push(m.ticket_id);
          }
        });

        setUnreadTicketIds(ticketsWithUnreadAdminReplies);
      }
    } catch (error) {
      console.error('Error fetching support notifications:', error);
    }
  }, [userId, isAdmin]);

  const markTicketAsRead = useCallback(async (ticketId: string) => {
    if (!userId) return;

    try {
      // Upsert the read record
      const { error } = await supabase
        .from('support_ticket_reads')
        .upsert(
          {
            ticket_id: ticketId,
            user_id: userId,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'ticket_id,user_id' }
        );

      if (error) {
        console.error('Error marking ticket as read:', error);
        return;
      }

      // Update local state immediately
      setUnreadTicketIds(prev => prev.filter(id => id !== ticketId));

      // Also clear any notifications from the notifications table for this ticket
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('type', 'ticket_reply')
        .contains('metadata', { ticket_id: ticketId });
    } catch (error) {
      console.error('Error marking ticket as read:', error);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchUnreadState();
  }, [fetchUnreadState]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const messagesChannel = supabase
      .channel(`support-messages-${isAdmin ? 'admin' : userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
        },
        () => {
          fetchUnreadState();
        }
      )
      .subscribe();

    const ticketsChannel = supabase
      .channel(`support-tickets-${isAdmin ? 'admin' : userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchUnreadState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [userId, isAdmin, fetchUnreadState]);

  return {
    unreadTicketIds,
    unreadCount: unreadTicketIds.length,
    markTicketAsRead,
    refreshUnreadState: fetchUnreadState,
  };
}
