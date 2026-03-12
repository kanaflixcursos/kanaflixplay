import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Mail, Send, Eye, Trash2, Users, CheckCircle, XCircle, Pencil, MailOpen, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard';

type Campaign = {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  status: string;
  target_type: string;
  target_filters: Record<string, string>;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  open_count: number;
  sent_at: string | null;
  created_at: string;
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  sending: { label: 'Enviando...', color: 'bg-chart-4/10 text-chart-4' },
  sent: { label: 'Enviada', color: 'bg-chart-2/10 text-chart-2' },
  failed: { label: 'Falhou', color: 'bg-destructive/10 text-destructive' },
};

export default function MarketingEmail() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [totalOpened, setTotalOpened] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    const result = (data as unknown as Campaign[]) || [];
    setCampaigns(result);
    setTotalCampaigns(result.length);
    setTotalSent(result.reduce((sum, c) => sum + (c.sent_count || 0), 0));
    setTotalOpened(result.reduce((sum, c) => sum + (c.open_count || 0), 0));
    setLoading(false);
  }, []);

  const fetchLeadMeta = useCallback(async () => {
    const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    setTotalLeads(count || 0);
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchLeadMeta();
  }, [fetchCampaigns, fetchLeadMeta]);

  const handleDelete = async (id: string) => {
    await supabase.from('email_campaigns').delete().eq('id', id);
    toast.success('Campanha excluída');
    fetchCampaigns();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Campanhas de Email</h1>
            <p className="text-muted-foreground text-sm mt-1">Envie emails em massa para leads e alunos</p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/marketing/email/new')}>
          <Plus className="h-4 w-4 mr-1" /> Nova Campanha
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard icon={Mail} title="Campanhas" value={totalCampaigns} loading={loading} iconColor="text-primary" iconBgColor="bg-primary/10" />
        <StatCard icon={Send} title="Emails Enviados" value={totalSent} loading={loading} iconColor="text-chart-2" iconBgColor="bg-chart-2/10" />
        <StatCard icon={MailOpen} title="Emails Abertos" value={totalOpened} loading={loading} iconColor="text-chart-4" iconBgColor="bg-chart-4/10" />
        <StatCard icon={Users} title="Leads Disponíveis" value={totalLeads} loading={loading} iconColor="text-chart-3" iconBgColor="bg-chart-3/10" />
      </div>

      <Card>
        <CardHeader className="dashboard-card-header">
          <CardTitle className="card-title-compact">Campanhas</CardTitle>
        </CardHeader>
        <CardContent className="dashboard-card-content">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma campanha criada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Público</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => {
                    const st = statusLabels[c.status] || statusLabels.draft;
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/marketing/email/${c.id}`)}
                      >
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-48 truncate">{c.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {c.target_type === 'leads' ? 'Leads' : 'Alunos'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${st.color}`}>
                            {st.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.sent_count > 0 ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-chart-2" />
                              {c.sent_count}
                              {c.failed_count > 0 && (
                                <span className="text-destructive flex items-center gap-0.5 ml-1">
                                  <XCircle className="h-3 w-3" />{c.failed_count}
                                </span>
                              )}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.sent_at
                            ? format(new Date(c.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : format(new Date(c.created_at), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => navigate(`/admin/marketing/email/${c.id}`)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(c.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
