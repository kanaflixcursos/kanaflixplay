import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useLeads } from '@/features/marketing/hooks/useLeads';
import { Lead, LeadStatus } from '@/features/marketing/types';
import { leadStatusMap } from '@/lib/lead-constants';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import StatCard from '@/components/StatCard';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from '@/components/ui/pagination';
import { Search, Download, ArrowLeft, Users, UserPlus, UserCheck, Tag, X, Plus, Filter, Trash2 } from 'lucide-react';

const statusMap = leadStatusMap;
const PAGE_SIZE = 50;

export default function MarketingLeads() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 300);

  const {
    leads,
    totalCount,
    isLoading,
    filters,
    setFilters,
    page,
    setPage,
    stats,
    distinctTags,
    distinctSources,
    updateLeadStatus,
    updateLeadTags,
    deleteLeads,
    bulkUpdateStatus,
  } = useLeads();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newTag, setNewTag] = useState('');
  
  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  // Update filters effect
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch, setFilters]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters]);

  const hasActiveFilters = useMemo(() => 
    filters.status !== 'all' || filters.tag !== 'all' || filters.source !== 'all' || filters.search,
    [filters]
  );
  
  const handleExportCSV = () => {
    // This should be a backend function for scalability, but keeping client-side for now.
    if (!leads.length) return;
    const header = 'Nome,Email,Telefone,Status,Origem,UTM Source,UTM Medium,UTM Campaign,Tags,Data\n';
    const rows = leads.map(l =>
      `"${l.name || ''}","${l.email}","${l.phone || ''}","${l.status}","${l.source}","${l.utm_source || ''}","${l.utm_medium || ''}","${l.utm_campaign || ''}","${(l.tags || []).join('; ')}","${format(new Date(l.created_at), 'dd/MM/yyyy HH:mm')}"`
    ).join('\n');
    const blob = new Blob([`\uFEFF${header}` + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleAddTag = () => {
    if (!selectedLead || !newTag.trim()) return;
    const tag = newTag.trim().toLowerCase();
    const updatedTags = [...new Set([...(selectedLead.tags || []), tag])];
    updateLeadTags({ leadId: selectedLead.id, tags: updatedTags });
    setNewTag('');
    setSelectedLead(prev => prev ? { ...prev, tags: updatedTags } : null);
  };

  const handleRemoveTag = (tag: string) => {
    if (!selectedLead) return;
    const updatedTags = (selectedLead.tags || []).filter(t => t !== tag);
    updateLeadTags({ leadId: selectedLead.id, tags: updatedTags });
    setSelectedLead(prev => prev ? { ...prev, tags: updatedTags } : null);
  };

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

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    deleteLeads(ids, {
      onSuccess: () => {
        setSelectedIds(new Set());
        setDeleteDialogOpen(false);
      }
    });
  };

  const handleBulkStatusChange = (newStatus: LeadStatus) => {
    const ids = Array.from(selectedIds);
    bulkUpdateStatus({ ids, status: newStatus }, {
      onSuccess: () => setSelectedIds(new Set())
    });
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

      <div className="grid gap-3 grid-cols-3">
        <StatCard icon={Users} title="Total de Leads" value={stats?.total} loading={isLoading} iconColor="text-primary" iconBgColor="bg-primary/10" />
        <StatCard icon={UserPlus} title="Novos" value={stats?.new} loading={isLoading} iconColor="text-chart-4" iconBgColor="bg-chart-4/10" />
        <StatCard icon={UserCheck} title="Convertidos" value={stats?.converted} loading={isLoading} iconColor="text-chart-2" iconBgColor="bg-chart-2/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2">Leads {totalCount > 0 && `(${totalCount})`}
                {hasActiveFilters && <Badge variant="secondary" className="font-normal"><Filter className="h-3 w-3 mr-1" />Filtros ativos</Badge>}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-48" />
                <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filters.status} onValueChange={(v) => setFilters(p => ({...p, status: v as LeadStatus | 'all' }))}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(statusMap).map(([key, { label }]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.source} onValueChange={(v) => setFilters(p => ({...p, source: v as string | 'all' }))}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  {distinctSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.tag} onValueChange={(v) => setFilters(p => ({...p, tag: v as string | 'all' }))}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Tags</SelectItem>
                  {distinctTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasActiveFilters && <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setFilters({ status: 'all', tag: 'all', source: 'all', search: '' })}><X className="h-3 w-3 mr-1" /> Limpar</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-3 p-2 rounded-md bg-muted">
              <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
              <Select onValueChange={(v) => handleBulkStatusChange(v as LeadStatus)}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Alterar status" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusMap).map(([key, { label }]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.size === leads.length && leads.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Origem</TableHead><TableHead>Tags</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                ) : leads.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum lead encontrado.</TableCell></TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id} data-state={selectedIds.has(lead.id) ? 'selected' : undefined}>
                      <TableCell><Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                      <TableCell className="font-medium">{lead.name || '—'}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{lead.source}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {(lead.tags || []).slice(0, 2).map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                          {(lead.tags || []).length > 2 && <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 2}</span>}
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setSelectedLead(lead); setTagDialogOpen(true); }}><Tag className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={lead.status} onValueChange={(v) => updateLeadStatus({ leadId: lead.id, status: v as LeadStatus })}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusMap).map(([key, { label }]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {pageCount > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.max(0, p - 1)); }} disabled={page === 0} /></PaginationItem>
                {Array.from({ length: pageCount }).map((_, i) => (
                    <PaginationItem key={i}>
                        <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(i); }} isActive={page === i}>{i + 1}</PaginationLink>
                    </PaginationItem>
                )).slice(Math.max(0, page - 2), page + 3)}
                <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.min(pageCount - 1, p + 1)); }} disabled={page === pageCount - 1} /></PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Tags — {selectedLead?.name || selectedLead?.email}</DialogTitle></DialogHeader><div className="space-y-4"><div className="flex flex-wrap gap-1.5">{!selectedLead?.tags?.length && <p className="text-xs text-muted-foreground">Nenhuma tag</p>}{(selectedLead?.tags || []).map(tag => <Badge key={tag} variant="secondary" className="gap-1 pr-1">{tag}<button onClick={() => handleRemoveTag(tag)}><X className="h-3 w-3" /></button></Badge>)}</div><div className="flex gap-2"><Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Nova tag..." onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} /><Button size="sm" onClick={handleAddTag}><Plus className="h-3 w-3" /></Button></div></div></DialogContent></Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir {selectedIds.size} lead(s)?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
