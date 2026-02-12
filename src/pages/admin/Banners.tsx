import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Trash2, Edit, Image, Loader2, ExternalLink, Eye, BookOpen, PlayCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

type BannerPlacement = 'cursos_destaque' | 'talvez_interesse';

const PLACEMENT_CONFIG: Record<BannerPlacement, { label: string; dimensions: string; aspectRatio: string }> = {
  cursos_destaque: {
    label: 'Cursos em destaque',
    dimensions: '1200 × 200px',
    aspectRatio: '6/1',
  },
  talvez_interesse: {
    label: 'Talvez você se interesse',
    dimensions: '1080 × 1350px',
    aspectRatio: '4/5',
  },
};

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  placement: string;
  order_index: number;
  created_at: string;
  course_id: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; banner: Banner | null }>({
    open: false,
    banner: null,
  });
  const [activeTab, setActiveTab] = useState<string>('manage');

  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [placement, setPlacement] = useState<BannerPlacement>('cursos_destaque');
  const [courseId, setCourseId] = useState<string>('');
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

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title, description, thumbnail_url')
      .eq('is_published', true)
      .order('title');
    setCourses(data || []);
  };

  useEffect(() => {
    fetchBanners();
    fetchCourses();
  }, []);

  const resetForm = () => {
    setImageFile(null);
    setLinkUrl('');
    setIsActive(true);
    setPlacement('cursos_destaque');
    setCourseId('');
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
    setPlacement((banner.placement as BannerPlacement) || 'cursos_destaque');
    setCourseId(banner.course_id || '');
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
    if (placement === 'talvez_interesse' && !courseId) {
      toast.error('Selecione um curso');
      return;
    }
    if (placement === 'cursos_destaque' && !editingBanner && !imageFile) {
      toast.error('Selecione uma imagem');
      return;
    }

    setSaving(true);

    try {
      let imageUrl = editingBanner?.image_url || '';

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

      // For talvez_interesse, use the course thumbnail if no image was uploaded
      if (placement === 'talvez_interesse' && !imageFile && !editingBanner) {
        const selectedCourse = courses.find(c => c.id === courseId);
        imageUrl = selectedCourse?.thumbnail_url || '';
      }

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update({
            image_url: imageUrl,
            link_url: linkUrl || null,
            is_active: isActive,
            placement,
            course_id: placement === 'talvez_interesse' ? courseId : null,
          })
          .eq('id', editingBanner.id);

        if (error) throw error;
        toast.success('Banner atualizado!');
      } else {
        const samePlacementBanners = banners.filter(b => b.placement === placement);
        const maxOrder = samePlacementBanners.length > 0
          ? Math.max(...samePlacementBanners.map(b => b.order_index))
          : -1;

        const { error } = await supabase
          .from('banners')
          .insert({
            image_url: imageUrl,
            link_url: linkUrl || null,
            is_active: isActive,
            order_index: maxOrder + 1,
            placement,
            course_id: placement === 'talvez_interesse' ? courseId : null,
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

  const getCourseName = (cId: string | null) => {
    if (!cId) return null;
    return courses.find(c => c.id === cId)?.title || 'Curso não encontrado';
  };

  const destaqueBanners = banners.filter(b => b.placement === 'cursos_destaque');
  const interesseBanners = banners.filter(b => b.placement === 'talvez_interesse');

  const activeDestaqueBanners = destaqueBanners.filter(b => b.is_active);
  const activeInteresseBanners = interesseBanners.filter(b => b.is_active);

  const config = PLACEMENT_CONFIG[placement];

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="manage">Gerenciar</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-6 mt-4">
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
            <>
              {/* Cursos em destaque */}
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  Cursos em destaque
                  <Badge variant="outline" className="text-xs font-normal">1200×200</Badge>
                </h2>
                {destaqueBanners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum banner nesta categoria.</p>
                ) : (
                  <div className="grid gap-3">
                    {destaqueBanners.map((banner, index) => (
                      <BannerRow
                        key={banner.id}
                        banner={banner}
                        index={index}
                        onEdit={openEditDialog}
                        onDelete={(b) => setDeleteDialog({ open: true, banner: b })}
                        onToggle={handleToggleActive}
                        thumbnailRatio="6/1"
                        courseName={null}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Talvez você se interesse */}
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  Talvez você se interesse
                  <Badge variant="outline" className="text-xs font-normal">Cursos vinculados</Badge>
                </h2>
                {interesseBanners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum banner nesta categoria.</p>
                ) : (
                  <div className="grid gap-3">
                    {interesseBanners.map((banner, index) => (
                      <BannerRow
                        key={banner.id}
                        banner={banner}
                        index={index}
                        onEdit={openEditDialog}
                        onDelete={(b) => setDeleteDialog({ open: true, banner: b })}
                        onToggle={handleToggleActive}
                        thumbnailRatio="4/5"
                        courseName={getCourseName(banner.course_id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-4">
          <PreviewSection
            activeDestaqueBanners={activeDestaqueBanners}
            activeInteresseBanners={activeInteresseBanners}
            courses={courses}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? 'Editar Banner' : 'Novo Banner'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de banner</Label>
              <Select
                value={placement}
                onValueChange={(v) => setPlacement(v as BannerPlacement)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cursos_destaque">Cursos em destaque (1200×200)</SelectItem>
                  <SelectItem value="talvez_interesse">Talvez você se interesse (curso vinculado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Course selector for talvez_interesse */}
            {placement === 'talvez_interesse' && (
              <div>
                <Label>Curso vinculado</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  O card usará a thumbnail, título, descrição e dados do curso selecionado.
                </p>
              </div>
            )}

            {/* Image upload - only required for cursos_destaque */}
            {placement === 'cursos_destaque' && (
              <div>
                <Label>
                  Imagem{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    (recomendado {config.dimensions})
                  </span>
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {imagePreview ? (
                  <div className="mt-2 w-full max-h-60 rounded overflow-hidden border" style={{ aspectRatio: config.aspectRatio }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="mt-2 w-full max-h-60 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm"
                    style={{ aspectRatio: config.aspectRatio }}
                  >
                    {config.dimensions}
                  </div>
                )}
              </div>
            )}

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

/* Banner row component */
function BannerRow({
  banner,
  index,
  onEdit,
  onDelete,
  onToggle,
  thumbnailRatio,
  courseName,
}: {
  banner: Banner;
  index: number;
  onEdit: (b: Banner) => void;
  onDelete: (b: Banner) => void;
  onToggle: (b: Banner) => void;
  thumbnailRatio: string;
  courseName: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={!banner.is_active ? 'opacity-60' : ''}>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="w-20 md:w-28 flex-shrink-0 rounded overflow-hidden"
              style={{ aspectRatio: thumbnailRatio }}
            >
              <img
                src={banner.image_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  Banner #{index + 1}
                </span>
                {!banner.is_active && (
                  <span className="text-xs text-muted-foreground">(Inativo)</span>
                )}
              </div>
              {courseName && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mb-0.5">
                  <BookOpen className="h-3 w-3" />
                  {courseName}
                </p>
              )}
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
                onCheckedChange={() => onToggle(banner)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(banner)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onDelete(banner)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* Preview section */
function PreviewSection({
  activeDestaqueBanners,
  activeInteresseBanners,
  courses,
}: {
  activeDestaqueBanners: Banner[];
  activeInteresseBanners: Banner[];
  courses: Course[];
}) {
  const [courseMeta, setCourseMeta] = useState<Record<string, { lessonCount: number; totalDuration: number }>>({});

  useEffect(() => {
    const fetchMeta = async () => {
      const courseIds = activeInteresseBanners
        .map(b => b.course_id)
        .filter(Boolean) as string[];

      if (courseIds.length === 0) return;

      const meta: Record<string, { lessonCount: number; totalDuration: number }> = {};
      await Promise.all(
        courseIds.map(async (cId) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id, duration_minutes')
            .eq('course_id', cId)
            .eq('is_hidden', false);

          meta[cId] = {
            lessonCount: lessons?.length || 0,
            totalDuration: lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0,
          };
        })
      );
      setCourseMeta(meta);
    };

    fetchMeta();
  }, [activeInteresseBanners]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Visualize como os alunos veem os banners na página de cursos (somente banners ativos).
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Cursos em destaque preview */}
        <section>
          <h3 className="text-base font-semibold mb-3">Cursos em destaque</h3>
          {activeDestaqueBanners.length === 0 ? (
            <div className="w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm py-8">
              Nenhum banner ativo nesta posição
            </div>
          ) : (
            <div className="space-y-3">
              {activeDestaqueBanners.map((banner) => (
                <div key={banner.id} className="w-full rounded-lg overflow-hidden border" style={{ aspectRatio: '6/1' }}>
                  <img src={banner.image_url} alt="Banner destaque" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Talvez você se interesse preview */}
        <section>
          <h3 className="text-base font-semibold mb-3">Talvez você se interesse</h3>
          {activeInteresseBanners.length === 0 ? (
            <div className="w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm py-8">
              Nenhum banner ativo nesta posição
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {activeInteresseBanners.slice(0, 3).map((banner) => {
                const course = courses.find(c => c.id === banner.course_id);
                const meta = banner.course_id ? courseMeta[banner.course_id] : null;

                return (
                  <Card key={banner.id} className="overflow-hidden">
                    <div className="flex h-full">
                      <div className="w-28 md:w-32 flex-shrink-0">
                        <div className="aspect-[4/5] w-full overflow-hidden rounded-l-lg">
                          <img
                            src={course?.thumbnail_url || banner.image_url}
                            alt={course?.title || 'Banner'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
                        <div>
                          <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                            {course?.title || 'Curso'}
                          </h4>
                          {course?.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {course.description}
                            </p>
                          )}
                        </div>
                        {meta && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <PlayCircle className="h-3 w-3" />
                              {meta.lessonCount} {meta.lessonCount === 1 ? 'aula' : 'aulas'}
                            </span>
                            {meta.totalDuration > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(meta.totalDuration)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
