import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  MessageCircle,
  Circle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: 'Aberto', variant: 'secondary' },
  in_progress: { label: 'Em Andamento', variant: 'default' },
  resolved: { label: 'Resolvido', variant: 'outline' },
  closed: { label: 'Fechado', variant: 'outline' },
};

const categoryLabels: Record<string, string> = {
  question: 'Dúvida',
  feedback: 'Feedback',
  bug: 'Problema Técnico',
  other: 'Outro',
  refund: 'Reembolso',
};

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', category: 'question' });

  const { unreadTicketIds } = useSupportNotifications({ userId: user?.id, isAdmin: false });

  const fetchTickets = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, category, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data) {
      const ticketIds = data.map(t => t.id);
      const { data: msgs } = await supabase
        .from('support_ticket_messages')
        .select('ticket_id')
        .in('ticket_id', ticketIds);

      const countMap = new Map<string, number>();
      (msgs || []).forEach(m => countMap.set(m.ticket_id, (countMap.get(m.ticket_id) || 0) + 1));

      setTickets(data.map(t => ({ ...t, message_count: countMap.get(t.id) || 0 })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreateTicket = async () => {
    if (!user || !newTicket.subject.trim() || !newTicket.message.trim()) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({ user_id: user.id, subject: newTicket.subject.trim(), message: newTicket.message.trim(), category: newTicket.category })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar ticket');
    } else {
      toast.success('Ticket criado!');
      setNewTicket({ subject: '', message: '', category: 'question' });
      setIsNewTicketOpen(false);
      if (data) navigate(`/suporte/${data.id}`);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
            <p className="text-sm text-muted-foreground">Central de ajuda e atendimento</p>
          </div>
          <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Ticket</DialogTitle>
                <DialogDescription>Descreva sua dúvida ou problema</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={newTicket.category} onValueChange={v => setNewTicket({ ...newTicket, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">Dúvida</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="bug">Problema Técnico</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input placeholder="Resumo da solicitação" value={newTicket.subject} onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea placeholder="Descreva em detalhes..." rows={4} value={newTicket.message} onChange={e => setNewTicket({ ...newTicket, message: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewTicketOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateTicket} disabled={!newTicket.subject.trim() || !newTicket.message.trim() || submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <HelpCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Nenhum ticket</p>
              <p className="text-sm text-muted-foreground mt-1">Crie um novo ticket para entrar em contato</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map(ticket => {
              const status = statusConfig[ticket.status] || statusConfig.open;
              const hasUnread = unreadTicketIds.includes(ticket.id);

              return (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/suporte/${ticket.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  {hasUnread && <Circle className="h-2 w-2 fill-primary text-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{ticket.subject}</span>
                      <Badge variant={status.variant} className="text-[10px] h-5 shrink-0">{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span>{categoryLabels[ticket.category] || ticket.category}</span>
                      <span>·</span>
                      <span>#{ticket.id.slice(0, 6).toUpperCase()}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}</span>
                      {(ticket.message_count ?? 0) > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <MessageCircle className="h-3 w-3" />
                            {ticket.message_count}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
