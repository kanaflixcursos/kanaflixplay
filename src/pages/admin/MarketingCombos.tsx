import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCombos, useInvalidateCombos } from '@/hooks/queries/useCombos';
import { deleteCombo } from '@/services/comboService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, ArrowLeft, Pencil, Trash2, Copy, ExternalLink, Package,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function MarketingCombos() {
  const navigate = useNavigate();
  const { data: combos, isLoading } = useCombos();
  const invalidate = useInvalidateCombos();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [linkCombo, setLinkCombo] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const allSelected = combos && combos.length > 0 && selectedIds.size === combos.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((combos || []).map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCombo(deleteId);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteId); return n; });
      invalidate();
      toast.success('Combo excluído');
    } catch {
      toast.error('Erro ao excluir combo');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteCombo(id)));
      invalidate();
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} combo(s) excluído(s)`);
    } catch {
      toast.error('Erro ao excluir combos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkToggle = async (activate: boolean) => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          supabase.from('combos').update({ is_active: activate }).eq('id', id)
        )
      );
      invalidate();
      setSelectedIds(new Set());
      toast.success(activate ? 'Combos ativados' : 'Combos desativados');
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const handleToggleActive = async (comboId: string, currentActive: boolean) => {
    setTogglingId(comboId);
    try {
      const { error } = await supabase
        .from('combos')
        .update({ is_active: !currentActive })
        .eq('id', comboId);
      if (error) throw error;
      invalidate();
      toast.success(!currentActive ? 'Combo ativado' : 'Combo desativado');
    } catch {
      toast.error('Erro ao alterar status');
    } finally {
      setTogglingId(null);
    }
  };

  const checkoutLink = linkCombo ? `https://cursos.kanaflix.com.br/checkout/combo/${linkCombo.id}` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Combos</h1>
            <p className="text-muted-foreground text-sm">Pacotes de cursos com preço especial</p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/marketing/combos/new')} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Combo
        </Button>
      </div>

      {/* Bulk actions bar */}
      {someSelected && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60 border text-sm">
          <span className="font-medium">{selectedIds.size} selecionado(s)</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => handleBulkToggle(true)}>Ativar</Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkToggle(false)}>Desativar</Button>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Excluir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar</Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !combos?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium text-lg">Nenhum combo criado</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Crie pacotes de cursos com preços promocionais.</p>
            <Button onClick={() => navigate('/admin/marketing/combos/new')}>
              <Plus className="h-4 w-4 mr-1.5" />
              Criar Combo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Combo</TableHead>
                <TableHead className="hidden md:table-cell">Cursos</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="hidden sm:table-cell">Usos</TableHead>
                <TableHead className="hidden lg:table-cell">Validade</TableHead>
                <TableHead className="w-16 text-center">Status</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combos.map(combo => {
                const isExpired = combo.expires_at && new Date(combo.expires_at) < new Date();
                return (
                  <TableRow key={combo.id} className={selectedIds.has(combo.id) ? 'bg-muted/40' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(combo.id)}
                        onCheckedChange={() => toggleSelect(combo.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {combo.thumbnail_url ? (
                          <img src={combo.thumbnail_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium text-sm truncate max-w-[200px]">{combo.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                        {combo.courses.length > 0
                          ? combo.courses.map(c => c.title).join(', ')
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm whitespace-nowrap">
                      {formatPrice(combo.price)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {combo.max_uses != null
                        ? `${combo.used_count}/${combo.max_uses}`
                        : '∞'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {combo.expires_at ? (
                        <span className={isExpired ? 'text-destructive' : ''}>
                          {new Date(combo.expires_at).toLocaleDateString('pt-BR')}
                          {isExpired && ' (expirado)'}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={combo.is_active}
                        disabled={togglingId === combo.id}
                        onCheckedChange={() => handleToggleActive(combo.id, combo.is_active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/marketing/combos/${combo.id}/edit`)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLinkCombo({ id: combo.id, title: combo.title })}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(combo.id)}>
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

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir combo?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link dialog */}
      <Dialog open={!!linkCombo} onOpenChange={() => setLinkCombo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link do Combo</DialogTitle>
            <DialogDescription>{linkCombo?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Link de Checkout</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={checkoutLink} className="text-sm" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(checkoutLink); toast.success('Link copiado!'); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
