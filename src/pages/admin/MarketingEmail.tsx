import { useMemo } from 'react';
import { useCampaigns } from '@/features/marketing/hooks/useCampaigns';
import { useLeads } from '@/features/marketing/hooks/useLeads';
import { CampaignStatus } from '@/features/marketing/types';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Mail, Send, Trash2, Users, CheckCircle, XCircle, Pencil, MailOpen } from 'lucide-react';
import StatCard from '@/components/StatCard';

const statusLabels: Record<CampaignStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  sending: { label: 'Enviando...', color: 'bg-chart-4/10 text-chart-4' },
  sent: { label: 'Enviada', color: 'bg-chart-2/10 text-chart-2' },
  failed: { label: 'Falhou', color: 'bg-destructive/10 text-destructive' },
};

export default function MarketingEmail() {
  const navigate = useNavigate();
  const { campaigns, isLoading, deleteCampaign } = useCampaigns();
  const { stats: leadStats } = useLeads();

  const campaignStats = useMemo(() => {
    if (!campaigns) return { totalSent: 0, totalOpened: 0 };
    return {
      totalSent: campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
      totalOpened: campaigns.reduce((sum, c) => sum + (c.open_count || 0), 0),
    };
  }, [campaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-semibold">Campanhas de Email</h1>
            <p className="text-muted-foreground text-sm mt-1">Envie emails em massa para leads e alunos</p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/marketing/email/new')}><Plus className="h-4 w-4 mr-1" /> Nova Campanha</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard icon={Mail} title="Campanhas" value={campaigns.length} loading={isLoading} />
        <StatCard icon={Send} title="Emails Enviados" value={campaignStats.totalSent} loading={isLoading} />
        <StatCard icon={MailOpen} title="Emails Abertos" value={campaignStats.totalOpened} loading={isLoading} />
        <StatCard icon={Users} title="Leads Disponíveis" value={leadStats?.total} loading={!leadStats} />
      </div>

      <Card>
        <CardHeader><CardTitle>Campanhas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Mail className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Nenhuma campanha criada</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Público</TableHead><TableHead>Status</TableHead><TableHead>Performance</TableHead><TableHead>Data</TableHead><TableHead className="w-28">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {campaigns.map((c) => {
                    const st = statusLabels[c.status] || statusLabels.draft;
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/marketing/email/${c.id}`)}>
                        <TableCell className="font-medium">{c.name}<p className="text-xs text-muted-foreground font-normal truncate max-w-xs">{c.subject}</p></TableCell>
                        <TableCell><Badge variant="outline">{c.target_type === 'leads' ? 'Leads' : 'Alunos'}</Badge></TableCell>
                        <TableCell><span className={`text-xs font-medium px-2 py-1 rounded-full ${st.color}`}>{st.label}</span></TableCell>
                        <TableCell className="text-sm">
                          {c.status === 'sent' || c.status === 'sending' ? (
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-chart-2" />{c.sent_count || 0} <span className="hidden sm:inline">enviados</span></span>
                                <span className="flex items-center gap-1.5"><MailOpen className="h-3.5 w-3.5 text-chart-4" />{c.open_count || 0} <span className="hidden sm:inline">aberturas</span></span>
                                {c.failed_count > 0 && <span className="flex items-center gap-1.5 text-destructive"><XCircle className="h-3.5 w-3.5" />{c.failed_count} <span className="hidden sm:inline">falhas</span></span>}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(c.sent_at || c.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell><div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/marketing/email/${c.id}`)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCampaign(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div></TableCell>
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
