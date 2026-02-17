import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, ArrowLeft, Users, UserPlus, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StatCard from '@/components/StatCard';

type Lead = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  source: string;
  status: string;
  tags: string[];
  created_at: string;
  form_id: string | null;
};

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'Novo', variant: 'default' },
  contacted: { label: 'Contatado', variant: 'secondary' },
  qualified: { label: 'Qualificado', variant: 'outline' },
  converted: { label: 'Convertido', variant: 'default' },
  lost: { label: 'Perdido', variant: 'destructive' },
};

export default function MarketingLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [totalLeads, setTotalLeads] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100);

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [search, statusFilter]);

  const fetchStats = useCallback(async () => {
    const [{ count: total }, { count: newCount }, { count: converted }] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
    ]);
    setTotalLeads(total || 0);
    setNewLeads(newCount || 0);
    setConvertedLeads(converted || 0);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [fetchLeads, fetchStats]);

  const handleExportCSV = () => {
    if (!leads.length) return;
    const header = 'Nome,Email,Telefone,Status,Origem,Data\n';
    const rows = leads.map(l =>
      `"${l.name || ''}","${l.email}","${l.phone || ''}","${l.status}","${l.source}","${format(new Date(l.created_at), 'dd/MM/yyyy HH:mm')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    await supabase.from('leads').update({
      status: newStatus,
      ...(newStatus === 'converted' ? { converted_at: new Date().toISOString() } : {}),
    }).eq('id', leadId);
    fetchLeads();
    fetchStats();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Banco de Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie todos os leads capturados</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 xs:grid-cols-3">
        <StatCard icon={Users} title="Total de Leads" value={totalLeads} loading={loading} iconColor="text-primary" iconBgColor="bg-primary/10" />
        <StatCard icon={UserPlus} title="Novos" value={newLeads} loading={loading} iconColor="text-chart-4" iconBgColor="bg-chart-4/10" />
        <StatCard icon={UserCheck} title="Convertidos" value={convertedLeads} loading={loading} iconColor="text-chart-2" iconBgColor="bg-chart-2/10" />
      </div>

      <Card>
        <CardHeader className="dashboard-card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <CardTitle className="card-title-compact">Leads</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="contacted">Contatado</SelectItem>
                  <SelectItem value="qualified">Qualificado</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="dashboard-card-content">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum lead encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name || '—'}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead.id, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusMap).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
