import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCombos, useInvalidateCombos } from '@/hooks/queries/useCombos';
import { deleteCombo, type Combo } from '@/services/comboService';
import { supabase } from '@/integrations/supabase/client';
import { DataList, type DataListColumn, type BulkAction } from '@/components/admin/DataList';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCombo(deleteId);
      invalidate();
      toast.success('Combo excluído');
    } catch {
      toast.error('Erro ao excluir combo');
    } finally {
      setDeleting(false);
      setDeleteId(null);
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

  const columns: DataListColumn<Combo>[] = [
    {
      key: 'title',
      header: 'Combo',
      render: (combo) => (
        <div className="flex items-center gap-2.5">
          {combo.thumbnail_url ? (
            <img src={combo.thumbnail_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <span className="font-medium text-sm truncate block max-w-52">{combo.title}</span>
            <span className="text-xs text-muted-foreground md:hidden">
              {combo.courses.length} curso{combo.courses.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Preço',
      align: 'right',
      render: (combo) => (
        <span className="font-semibold text-sm whitespace-nowrap">{formatPrice(combo.price)}</span>
      ),
    },
    {
      key: 'uses',
      header: 'Usos',
      hideMobile: true,
      render: (combo) => (
        <span className="text-sm text-muted-foreground">
          {combo.max_uses != null ? `${combo.used_count}/${combo.max_uses}` : '∞'}
        </span>
      ),
    },
    {
      key: 'expires',
      header: 'Validade',
      hideMobile: true,
      render: (combo) => {
        if (!combo.expires_at) return <span className="text-sm text-muted-foreground">—</span>;
        const isExpired = new Date(combo.expires_at) < new Date();
        return (
          <span className={`text-sm whitespace-nowrap ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
            {new Date(combo.expires_at).toLocaleDateString('pt-BR')}
            {isExpired && ' (expirado)'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      width: 'w-16',
      render: (combo) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={combo.is_active}
            disabled={togglingId === combo.id}
            onCheckedChange={() => handleToggleActive(combo.id, combo.is_active)}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      width: 'w-28',
      hideMobile: true,
      render: (combo) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
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
      ),
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      label: 'Ativar',
      variant: 'outline',
      onClick: async (ids) => {
        await Promise.all(Array.from(ids).map(id => supabase.from('combos').update({ is_active: true }).eq('id', id)));
        invalidate();
        toast.success('Combos ativados');
      },
    },
    {
      label: 'Desativar',
      variant: 'outline',
      onClick: async (ids) => {
        await Promise.all(Array.from(ids).map(id => supabase.from('combos').update({ is_active: false }).eq('id', id)));
        invalidate();
        toast.success('Combos desativados');
      },
    },
    {
      label: 'Excluir',
      variant: 'destructive',
      icon: <Trash2 className="h-3.5 w-3.5 mr-1" />,
      onClick: async (ids) => {
        await Promise.all(Array.from(ids).map(id => deleteCombo(id)));
        invalidate();
        toast.success(`${ids.size} combo(s) excluído(s)`);
      },
    },
  ];

  const checkoutLink = linkCombo ? `${settings?.production_url || window.location.origin}/checkout/combo/${linkCombo.id}` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Combos</h1>
          <p className="text-muted-foreground text-sm">Pacotes de cursos com preço especial</p>
        </div>
      </div>

      <DataList<Combo>
        title="Combos"
        columns={columns}
        data={combos || []}
        loading={isLoading}
        selectable
        bulkActions={bulkActions}
        searchPlaceholder="Buscar combo..."
        searchFilter={(combo, q) => combo.title.toLowerCase().includes(q.toLowerCase())}
        onRowClick={(combo) => navigate(`/admin/marketing/combos/${combo.id}/edit`)}
        emptyIcon={<Package className="h-12 w-12" />}
        emptyMessage="Nenhum combo criado"
        headerActions={
          <Button size="sm" onClick={() => navigate('/admin/marketing/combos/new')} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo Combo
          </Button>
        }
      />

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
