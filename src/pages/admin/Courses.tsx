import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { 
  Plus, 
  BookOpen, 
  Edit, 
  Trash2, 
  Eye, 
  Loader2, 
  Folder, 
  RefreshCw, 
  MoreHorizontal, 
  Globe, 
  FileText,
  Link2,
  EyeOff,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_published: boolean;
  created_at: string;
  pandavideo_folder_id: string | null;
  last_synced_at: string | null;
  price: number | null;
  lessonCount: number;
  enrollmentCount: number;
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; course: Course | null }>({
    open: false,
    course: null,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Link dialog state
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; course: Course | null }>({
    open: false,
    course: null,
  });
  const [copied, setCopied] = useState(false);

  const fetchCourses = async () => {
    const { data: coursesData, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
      return;
    }

    const coursesWithStats = await Promise.all(
      (coursesData || []).map(async (course) => {
        const [{ count: lessonCount }, { count: enrollmentCount }] = await Promise.all([
          supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', course.id),
          supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('course_id', course.id),
        ]);

        return {
          ...course,
          lessonCount: lessonCount || 0,
          enrollmentCount: enrollmentCount || 0,
        };
      })
    );

    setCourses(coursesWithStats);
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDelete = async () => {
    if (!deleteDialog.course) return;
    
    const course = deleteDialog.course;
    const expectedText = course.title.toLowerCase();
    
    if (deleteConfirmation.toLowerCase() !== expectedText) {
      toast.error('O texto de confirmação não confere');
      return;
    }
    
    setDeleting(true);

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', course.id);

    if (error) {
      toast.error('Erro ao excluir curso');
    } else {
      toast.success('Curso excluído com sucesso!');
      fetchCourses();
    }
    
    setDeleting(false);
    setDeleteDialog({ open: false, course: null });
    setDeleteConfirmation('');
  };

  const handleTogglePublish = async (course: Course) => {
    const { error } = await supabase
      .from('courses')
      .update({ is_published: !course.is_published })
      .eq('id', course.id);

    if (error) {
      toast.error('Erro ao alterar status');
    } else {
      toast.success(course.is_published ? 'Curso ocultado' : 'Curso publicado');
      fetchCourses();
    }
  };

  const handleSyncCourse = async (courseId?: string) => {
    if (courseId) {
      setSyncing(courseId);
    } else {
      setSyncingAll(true);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Você precisa estar autenticado');
        return;
      }

      const url = courseId 
        ? `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/sync-pandavideo-lessons?course_id=${courseId}`
        : `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/sync-pandavideo-lessons`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar');
      }

      toast.success(`Sincronização concluída: ${data.created} criadas, ${data.updated} atualizadas, ${data.deleted} removidas`);
      fetchCourses();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar aulas');
    } finally {
      setSyncing(null);
      setSyncingAll(false);
    }
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Nunca sincronizado';
    const d = new Date(date);
    return `Sync: ${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getCourseLink = (course: Course) => {
    const baseUrl = 'https://kanaflixplay.lovable.app';
    return `${baseUrl}/courses/${course.id}`;
  };

  const handleCopyLink = async (course: Course) => {
    const link = getCourseLink(course);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (price: number | null) => {
    if (!price || price <= 0) return 'Gratuito';
    return `R$ ${(price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const CourseActions = ({ course }: { course: Course }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover w-48">
        {course.pandavideo_folder_id && (
          <DropdownMenuItem 
            onClick={() => handleSyncCourse(course.id)}
            disabled={syncing === course.id}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing === course.id ? 'animate-spin' : ''}`} />
            Sincronizar Aulas
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Aulas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLinkDialog({ open: true, course })}>
          <Link2 className="h-4 w-4 mr-2" />
          Link de Compra
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Curso
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleTogglePublish(course)}>
          {course.is_published ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Ocultar Curso
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              Publicar Curso
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => setDeleteDialog({ open: true, course })}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir Curso
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Cursos</h1>
          <p className="text-muted-foreground text-sm md:text-base">Gerencie os cursos da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size={isMobile ? "icon" : "default"}
            onClick={() => handleSyncCourse()}
            disabled={syncingAll}
          >
            {syncingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!isMobile && 'Sincronizar Todos'}
              </>
            )}
          </Button>
          <Button onClick={() => navigate('/admin/courses/new')} size={isMobile ? "icon" : "default"}>
            <Plus className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
            {!isMobile && 'Novo Curso'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum curso cadastrado ainda.</p>
            <Button className="mt-4" onClick={() => navigate('/admin/courses/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Curso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3 md:gap-4">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-14 h-16 md:w-20 md:h-24 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-16 md:w-20 md:h-24 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="card-title truncate text-sm md:text-base">{course.title}</h3>
                      <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs">
                        {course.is_published ? 'Publicado' : 'Oculto'}
                      </Badge>
                      {course.price && course.price > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {formatPrice(course.price)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-success border-success/30">
                          Gratuito
                        </Badge>
                      )}
                    </div>
                    <p className="card-description line-clamp-1 hidden sm:block">
                      {course.description}
                    </p>
                    <div className="flex flex-wrap gap-2 md:gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{course.lessonCount} aulas</span>
                      <span>{course.enrollmentCount} alunos</span>
                      {course.pandavideo_folder_id && !isMobile && (
                        <>
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            Pandavideo
                          </span>
                          <span>{formatLastSync(course.last_synced_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Mobile: Dropdown menu */}
                  {isMobile ? (
                    <CourseActions course={course} />
                  ) : (
                    /* Desktop: Button row */
                    <div className="flex items-center gap-1.5">
                      {course.pandavideo_folder_id && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleSyncCourse(course.id)}
                          disabled={syncing === course.id}
                          title="Sincronizar aulas"
                        >
                          {syncing === course.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}
                        title="Ver aulas"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setLinkDialog({ open: true, course })}
                        title="Link de compra"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleTogglePublish(course)}
                        title={course.is_published ? 'Ocultar curso' : 'Publicar curso'}
                      >
                        {course.is_published ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, course })}
                        title="Excluir curso"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialog.open} onOpenChange={(open) => setLinkDialog({ open, course: open ? linkDialog.course : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link de Compra do Curso</DialogTitle>
            <DialogDescription>
              Compartilhe este link para que alunos possam comprar o curso diretamente.
            </DialogDescription>
          </DialogHeader>
          
          {linkDialog.course && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {linkDialog.course.thumbnail_url ? (
                  <img
                    src={linkDialog.course.thumbnail_url}
                    alt={linkDialog.course.title}
                    className="w-12 h-14 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-14 bg-muted rounded flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{linkDialog.course.title}</p>
                  <p className="text-sm text-muted-foreground">{formatPrice(linkDialog.course.price)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Link do curso</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={getCourseLink(linkDialog.course)} 
                    className="text-sm"
                  />
                  <Button 
                    size="icon" 
                    onClick={() => linkDialog.course && handleCopyLink(linkDialog.course)}
                    variant={copied ? "default" : "outline"}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {!linkDialog.course.is_published && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-4 w-4 text-warning-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-warning-foreground">
                    Este curso está oculto. Publique-o para que os alunos possam acessar.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog({ open: false, course: null })}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ open: false, course: null });
          setDeleteConfirmation('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Curso Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação é <strong>irreversível</strong>. O curso <strong>"{deleteDialog.course?.title}"</strong> será 
                excluído permanentemente junto com:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Todas as aulas e materiais associados</li>
                <li>Progresso de todos os alunos neste curso</li>
                <li>Comentários e interações</li>
                <li>Matrículas existentes</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirm" className="text-sm">
              Digite <strong className="text-destructive">"{deleteDialog.course?.title}"</strong> para confirmar:
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Digite o nome do curso..."
              className="border-destructive/50 focus-visible:ring-destructive"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || deleteConfirmation.toLowerCase() !== deleteDialog.course?.title.toLowerCase()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Permanentemente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
