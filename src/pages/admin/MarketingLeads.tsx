import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Download, ArrowLeft, Users, UserPlus, UserCheck, Tag, X, Plus, Filter, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard';
import { leadStatusMap } from '@/lib/lead-constants';

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

const statusMap = leadStatusMap;

export default function MarketingLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [totalLeads, setTotalLeads] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false);

  // Tag dialog
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newTag, setNewTag] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200);

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter);
    }
    if (tagFilter !== 'all') {
      query = query.contains('tags', [tagFilter]);
    }

    const { data } = await query;
    const result = (data as Lead[]) || [];
    setLeads(result);

    // Extract unique tags & sources
    const tags = new Set<string>();
    const sources = new Set<string>();
    result.forEach(l => {
      l.tags?.forEach(t => tags.add(t));
      if (l.source) sources.add(l.source);
    });
    setAllTags(Array.from(tags).sort());
    setAllSources(Array.from(sources).sort());
    setLoading(false);
  }, [search, statusFilter, tagFilter, sourceFilter]);

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
    const header = 'Nome,Email,Telefone,Status,Origem,Tags,Data\n';
    const rows = leads.map(l =>
      `"${l.name || ''}","${l.email}","${l.phone || ''}","${l.status}","${l.source}","${(l.tags || []).join('; ')}","${format(new Date(l.created_at), 'dd/MM/yyyy HH:mm')}"`
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

  const handleAddTag = async () => {
    if (!selectedLead || !newTag.trim()) return;
    const tag = newTag.trim().toLowerCase();
    const updatedTags = [...new Set([...(selectedLead.tags || []), tag])];
    await supabase.from('leads').update({ tags: updatedTags }).eq('id', selectedLead.id);
    setNewTag('');
    setSelectedLead({ ...selectedLead, tags: updatedTags });
    toast.success(`Tag "${tag}" adicionada`);
    fetchLeads();
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedLead) return;
    const updatedTags = (selectedLead.tags || []).filter(t => t !== tag);
    await supabase.from('leads').update({ tags: updatedTags }).eq('id', selectedLead.id);
    setSelectedLead({ ...selectedLead, tags: updatedTags });
    fetchLeads();
  };

  const hasActiveFilters = statusFilter !== 'all' || tagFilter !== 'all' || sourceFilter !== 'all' || search !== '';

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('leads').delete().in('id', ids);
    if (error) {
      toast.error('Erro ao excluir leads');
    } else {
      toast.success(`${ids.length} lead(s) excluído(s)`);
      setSelectedIds(new Set());
      fetchLeads();
      fetchStats();
    }
    setDeleteDialogOpen(false);
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    const ids = Array.from(selectedIds);
    setBulkStatusChanging(true);
    const { error } = await supabase.from('leads').update({
      status: newStatus,
      ...(newStatus === 'converted' ? { converted_at: new Date().toISOString() } : {}),
    }).in('id', ids);
    if (error) {
      toast.error('Erro ao alterar status');
    } else {
      toast.success(`${ids.length} lead(s) atualizados para "${statusMap[newStatus]?.label || newStatus}"`);
      setSelectedIds(new Set());
      fetchLeads();
      fetchStats();
    }
    setBulkStatusChanging(false);
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

      <div className="grid gap-4 grid-cols-3">
        <StatCard icon={Users} title="Total de Leads" value={totalLeads} loading={loading} iconColor="text-primary" iconBgColor="bg-primary/10" />
        <StatCard icon={UserPlus} title="Novos" value={newLeads} loading={loading} iconColor="text-chart-4" iconBgColor="bg-chart-4/10" />
        <StatCard icon={UserCheck} title="Convertidos" value={convertedLeads} loading={loading} iconColor="text-chart-2" iconBgColor="bg-chart-2/10" />
      </div>

      <Card>
        <CardHeader className="dashboard-card-header">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="card-title-compact flex items-center gap-2">
                Leads
                {hasActiveFilters && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    <Filter className="h-3 w-3 mr-1" /> Filtros ativos
                  </Badge>
                )}
              </CardTitle>
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
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>
            </div>

            {/* Advanced filters row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(statusMap).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  {allSources.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Tags</SelectItem>
                  {allTags.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => {
                  setStatusFilter('all');
                  setTagFilter('all');
                  setSourceFilter('all');
                  setSearch('');
                }}>
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="dashboard-card-content">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-3 p-2 rounded-md bg-muted">
              <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
              <Select onValueChange={handleBulkStatusChange} disabled={bulkStatusChanging}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Alterar status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusMap).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Cancelar
              </Button>
            </div>
          )}
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === leads.length && leads.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} data-state={selectedIds.has(lead.id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelect(lead.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{lead.name || '—'}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {(lead.tags || []).slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                          ))}
                          {(lead.tags || []).length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 2}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => { setSelectedLead(lead); setTagDialogOpen(true); }}
                          >
                            <Tag className="h-3 w-3" />
                          </Button>
                        </div>
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

      {/* Tag management dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Tags — {selectedLead?.name || selectedLead?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {(selectedLead?.tags || []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma tag</p>
              )}
              {(selectedLead?.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button size="sm" className="h-8" onClick={handleAddTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os leads selecionados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
