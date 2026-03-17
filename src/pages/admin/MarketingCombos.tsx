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
import { 
  Plus, ArrowLeft, Pencil, Trash2, Copy, BookOpen, ExternalLink,
  Package
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24" /></CardContent></Card>
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
        <div className="space-y-2">
          {combos.map(combo => (
            <Card key={combo.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {combo.thumbnail_url ? (
                  <img src={combo.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate text-sm">{combo.title}</h3>
                    <Badge variant={combo.is_active ? 'default' : 'secondary'} className="shrink-0 text-[10px] px-1.5 py-0">
                      {combo.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="font-bold text-primary text-sm">{formatPrice(combo.price)}</span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {combo.courses.length} curso{combo.courses.length !== 1 ? 's' : ''}
                    </span>
                    {combo.courses.length > 0 && (
                      <span className="hidden sm:inline truncate max-w-[200px]">
                        {combo.courses.map(c => c.title).join(', ')}
                      </span>
                    )}
                    {combo.max_uses != null && (
                      <span>Usos: {combo.used_count}/{combo.max_uses}</span>
                    )}
                    {combo.expires_at && (
                      <span>Validade: {new Date(combo.expires_at).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch
                    checked={combo.is_active}
                    disabled={togglingId === combo.id}
                    onCheckedChange={() => handleToggleActive(combo.id, combo.is_active)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/marketing/combos/${combo.id}/edit`)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLinkCombo({ id: combo.id, title: combo.title })}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(combo.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
