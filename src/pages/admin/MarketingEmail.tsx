import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Mail, Send, Eye, Trash2, Users, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [sending, setSending] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [targetType, setTargetType] = useState('leads');
  const [targetStatus, setTargetStatus] = useState('all');
  const [targetTag, setTargetTag] = useState('');

  // Stats
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);

  // Available tags
  const [availableTags, setAvailableTags] = useState<string[]>([]);

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
    setLoading(false);
  }, []);

  const fetchLeadMeta = useCallback(async () => {
    const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    setTotalLeads(count || 0);

    // Fetch unique tags
    const { data: leads } = await supabase.from('leads').select('tags').limit(500);
    const tags = new Set<string>();
    (leads || []).forEach((l: any) => (l.tags || []).forEach((t: string) => tags.add(t)));
    setAvailableTags(Array.from(tags).sort());
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchLeadMeta();
  }, [fetchCampaigns, fetchLeadMeta]);

  const handleCreate = async () => {
    if (!name || !subject || !htmlContent) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const filters: Record<string, string> = {};
    if (targetStatus !== 'all') filters.status = targetStatus;
    if (targetTag) filters.tag = targetTag;

    const { error } = await supabase.from('email_campaigns').insert({
      name,
      subject,
      html_content: htmlContent,
      target_type: targetType,
      target_filters: filters,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Campanha criada como rascunho');
    setDialogOpen(false);
    resetForm();
    fetchCampaigns();
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setHtmlContent('');
    setTargetType('leads');
    setTargetStatus('all');
    setTargetTag('');
  };

  const handleSend = async (campaign: Campaign) => {
    if (campaign.status !== 'draft') return;
    setSending(true);

    try {
      // Fetch recipients based on target
      let recipients: { email: string; name?: string }[] = [];

      if (campaign.target_type === 'leads') {
        let query = supabase.from('leads').select('email, name');
        if (campaign.target_filters?.status) {
          query = query.eq('status', campaign.target_filters.status);
        }
        if (campaign.target_filters?.tag) {
          query = query.contains('tags', [campaign.target_filters.tag]);
        }
        const { data } = await query;
        recipients = (data || []) as { email: string; name?: string }[];
      } else if (campaign.target_type === 'students') {
        const { data } = await supabase.from('profiles').select('email, full_name');
        recipients = (data || []).filter(p => p.email).map(p => ({ email: p.email!, name: p.full_name || undefined }));
      }

      if (recipients.length === 0) {
        toast.error('Nenhum destinatário encontrado com os filtros selecionados');
        setSending(false);
        return;
      }

      // Update campaign status
      await supabase.from('email_campaigns').update({
        status: 'sending',
        total_recipients: recipients.length,
      }).eq('id', campaign.id);

      // Send emails in batches
      let sentCount = 0;
      let failedCount = 0;
      const batchSize = 5;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(r =>
            supabase.functions.invoke('send-email', {
              body: {
                action: 'campaign',
                to: r.email,
                data: {
                  subject: campaign.subject,
                  htmlContent: campaign.html_content,
                  recipientName: r.name || '',
                },
              },
            })
          )
        );
        results.forEach(r => r.status === 'fulfilled' ? sentCount++ : failedCount++);
      }

      await supabase.from('email_campaigns').update({
        status: failedCount === recipients.length ? 'failed' : 'sent',
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      }).eq('id', campaign.id);

      toast.success(`Campanha enviada: ${sentCount} emails enviados, ${failedCount} falhas`);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar campanha');
      await supabase.from('email_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
      fetchCampaigns();
    } finally {
      setSending(false);
    }
  };

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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Campanha
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <StatCard icon={Mail} title="Campanhas" value={totalCampaigns} loading={loading} iconColor="text-primary" iconBgColor="bg-primary/10" />
        <StatCard icon={Send} title="Emails Enviados" value={totalSent} loading={loading} iconColor="text-chart-2" iconBgColor="bg-chart-2/10" />
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
                      <TableRow key={c.id}>
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { setSelectedCampaign(c); setPreviewOpen(true); }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {c.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary"
                                disabled={sending}
                                onClick={() => handleSend(c)}
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            )}
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

      {/* Create campaign dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha de Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Campanha</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Promoção Black Friday" />
            </div>
            <div>
              <Label>Assunto do Email</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: 🔥 Oferta especial para você!" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Público-alvo</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="students">Alunos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetType === 'leads' && (
                <div>
                  <Label>Filtro de Status</Label>
                  <Select value={targetStatus} onValueChange={setTargetStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="new">Novos</SelectItem>
                      <SelectItem value="contacted">Contatados</SelectItem>
                      <SelectItem value="qualified">Qualificados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {targetType === 'leads' && availableTags.length > 0 && (
              <div>
                <Label>Filtrar por Tag (opcional)</Label>
                <Select value={targetTag} onValueChange={setTargetTag}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {availableTags.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Conteúdo HTML do Email</Label>
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<h1>Olá {{name}}</h1><p>Conteúdo do email...</p>"
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Use HTML válido. O email será enviado com o branding padrão da Kanaflix.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Rascunho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview — {selectedCampaign?.name}</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Assunto:</span>
                <span className="font-medium">{selectedCampaign.subject}</span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={selectedCampaign.html_content}
                  className="w-full h-96 bg-white"
                  title="Email preview"
                  sandbox=""
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
