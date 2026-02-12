import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Image, Loader2, ExternalLink, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  placement: string;
  order_index: number;
  created_at: string;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; banner: Banner | null }>({
    open: false,
    banner: null,
  });

  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('order_index');

    if (error) {
      console.error('Error fetching banners:', error);
    } else {
      setBanners(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const resetForm = () => {
    setImageFile(null);
    setLinkUrl('');
    setIsActive(true);
    setEditingBanner(null);
    setImagePreview(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setLinkUrl(banner.link_url || '');
    setIsActive(banner.is_active);
    setImagePreview(banner.image_url);
    setFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!editingBanner && !imageFile) {
      toast.error('Selecione uma imagem');
      return;
    }

    setSaving(true);

    try {
      let imageUrl = editingBanner?.image_url || '';

      // Upload image if new file selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);

        imageUrl = publicUrl.publicUrl;
      }

      if (editingBanner) {
        // Update existing
        const { error } = await supabase
          .from('banners')
          .update({
            image_url: imageUrl,
            link_url: linkUrl || null,
            is_active: isActive,
          })
          .eq('id', editingBanner.id);

        if (error) throw error;
        toast.success('Banner atualizado!');
      } else {
        // Create new
        const maxOrder = banners.length > 0
          ? Math.max(...banners.map(b => b.order_index))
          : -1;

        const { error } = await supabase
          .from('banners')
          .insert({
            image_url: imageUrl,
            link_url: linkUrl || null,
            is_active: isActive,
            order_index: maxOrder + 1,
            placement: 'courses_page',
          });

        if (error) throw error;
        toast.success('Banner criado!');
      }

      setFormOpen(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Erro ao salvar banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.banner) return;

    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', deleteDialog.banner.id);

    if (error) {
      toast.error('Erro ao excluir banner');
    } else {
      toast.success('Banner excluído!');
      fetchBanners();
    }

    setDeleteDialog({ open: false, banner: null });
  };

  const handleToggleActive = async (banner: Banner) => {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: !banner.is_active })
      .eq('id', banner.id);

    if (error) {
      toast.error('Erro ao alterar status');
    } else {
      fetchBanners();
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Banners</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Gerencie os banners exibidos na página de cursos dos alunos
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Banner
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum banner cadastrado.</p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Banner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className={!banner.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <img
                      src={banner.image_url}
                      alt="Banner"
                      className="w-28 h-16 md:w-40 md:h-20 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          Banner #{index + 1}
                        </span>
                        {!banner.is_active && (
                          <span className="text-xs text-muted-foreground">(Inativo)</span>
                        )}
                      </div>
                      {banner.link_url && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {banner.link_url}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={banner.is_active}
                        onCheckedChange={() => handleToggleActive(banner)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(banner)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, banner })}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? 'Editar Banner' : 'Novo Banner'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Imagem</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1"
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-2 w-full max-h-40 object-cover rounded"
                />
              )}
            </div>
            <div>
              <Label>Link de destino (opcional)</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBanner ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, banner: open ? deleteDialog.banner : null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
