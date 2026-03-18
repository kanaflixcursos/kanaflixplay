import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Loader2, BookOpen, Users, Trophy, Search } from 'lucide-react';
import {
  Plus,
  Document,
  Edit,
  Delete,
  Swap,
  MoreCircle,
  Send,
  Paper,
  TickSquare,
  Danger,
} from 'react-iconly';
import { useIsMobile } from '@/hooks/use-mobile';
import StatCard from '@/components/StatCard';
import { motion } from 'framer-motion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAdminCourses, useCategories, usePandaFolders, useInvalidateCourses } from '@/hooks/queries/useCourses';
import { deleteCourse, syncPandavideoLessons } from '@/services/courseService';
import type { AdminCourse } from '@/services/courseService';

export default function AdminCourses() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const { data: courses = [], isLoading: loading } = useAdminCourses();
  const { data: categories = [] } = useCategories();
  const { data: pandaFolders = [] } = usePandaFolders();
  const invalidateCourses = useInvalidateCourses();

  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; course: AdminCourse | null }>({
    open: false,
    course: null,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; course: AdminCourse | null }>({
    open: false,
    course: null,
  });
  const [copied, setCopied] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  const totalStudents = useMemo(() => courses.reduce((sum, c) => sum + c.enrollmentCount, 0), [courses]);
  const bestSellingCourse = useMemo(() => {
    if (courses.length === 0) return null;
    const sorted = [...courses].sort((a, b) => b.enrollmentCount - a.enrollmentCount);
    return sorted[0]?.enrollmentCount > 0 ? sorted[0] : null;
  }, [courses]);

  const filteredCourses = useMemo(() => 
    courses.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || c.category_id === filterCategory || (filterCategory === 'none' && !c.category_id);
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'published' && c.is_published) || 
        (filterStatus === 'draft' && !c.is_published);
      return matchesSearch && matchesCategory && matchesStatus;
    }),
    [courses, searchQuery, filterCategory, filterStatus]
  );

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.name || null;
  };

  const handleDelete = async () => {
    if (!deleteDialog.course) return;
    const course = deleteDialog.course;
    if (deleteConfirmation.toLowerCase() !== course.title.toLowerCase()) {
      toast.error('O texto de confirmação não confere');
      return;
    }
    setDeleting(true);
    try {
      await deleteCourse(course.id);
      toast.success('Curso excluído com sucesso!');
      invalidateCourses();
    } catch {
      toast.error('Erro ao excluir curso');
    }
    setDeleting(false);
    setDeleteDialog({ open: false, course: null });
    setDeleteConfirmation('');
  };

  const handleSyncCourse = async (courseId?: string) => {
    if (courseId) setSyncing(courseId);
    else setSyncingAll(true);

    try {
      const data = await syncPandavideoLessons(courseId);
      toast.success(`Sincronização concluída: ${data.created} criadas, ${data.updated} atualizadas, ${data.deleted} removidas`);
      invalidateCourses();
    } catch {
      toast.error('Erro ao sincronizar aulas');
    } finally {
      setSyncing(null);
      setSyncingAll(false);
    }
  };

  const formatTotalDuration = (minutes: number) => {
    if (!minutes || minutes === 0) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins}min`;
  };

  const getCourseLink = (course: AdminCourse) => `${settings?.production_url || window.location.origin}/checkout/${course.id}`;
  const getPreviewLink = (course: AdminCourse) => `${settings?.production_url || window.location.origin}/courses/${course.id}`;

  const handleCopyLink = async (course: AdminCourse) => {
    await navigator.clipboard.writeText(getCourseLink(course));
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (price: number | null) => {
    if (!price || price <= 0) return 'Gratuito';
    return `R$ ${(price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const CourseActions = ({ course }: { course: AdminCourse }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreCircle size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover w-48">
        <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/edit`)}>
          <Edit size={16} />
          <span className="ml-2">Editar Curso</span>
        </DropdownMenuItem>
        {course.pandavideo_folder_id && (
          <DropdownMenuItem 
            onClick={() => handleSyncCourse(course.id)}
            disabled={syncing === course.id}
          >
            <Swap size={16} />
            <span className="ml-2">Sincronizar Aulas</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setLinkDialog({ open: true, course })}>
          <Send size={16} />
          <span className="ml-2">Link Compartilhável</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => setDeleteDialog({ open: true, course })}
          className="text-destructive focus:text-destructive"
        >
          <Delete size={16} />
          <span className="ml-2">Excluir Curso</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const MobileCourseCard = ({ course }: { course: AdminCourse }) => {
    const isExpanded = expandedCourseId === course.id;
    return (
      <Collapsible open={isExpanded} onOpenChange={() => setExpandedCourseId(isExpanded ? null : course.id)}>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-10 h-12 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                  <Document size={16} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium truncate text-sm">{course.title}</p>
                <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs mt-0.5">
                  {course.is_published ? 'Publicado' : 'Oculto'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CourseActions course={course} />
            </div>
          </div>
          <CollapsibleContent className="mt-4 pt-4 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Categoria:</span>
                <span className="ml-2 font-medium">{getCategoryName(course.category_id) || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Aulas:</span>
                <span className="ml-2 font-medium">{course.lessonCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Alunos:</span>
                <span className="ml-2 font-medium">{course.enrollmentCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Preço:</span>
                <span className="ml-2 font-medium">{formatPrice(course.price)}</span>
              </div>
              {course.totalDurationMinutes > 0 && (
                <div>
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="ml-2">{formatTotalDuration(course.totalDurationMinutes)}</span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cursos</h1>
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
                <Swap size={16} />
                {!isMobile && <span className="ml-1">Sincronizar Todos</span>}
              </>
            )}
          </Button>
          <Button onClick={() => navigate('/admin/courses/new')} size={isMobile ? "icon" : "default"}>
            <Plus size={16} />
            {!isMobile && <span className="ml-1">Novo Curso</span>}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-3 gap-3 md:gap-4 items-stretch"
      >
        <StatCard title="Total de Cursos" value={courses.length} icon={BookOpen} loading={loading} />
        <StatCard title="Total de Alunos" value={totalStudents} icon={Users} loading={loading} />
        <StatCard
          title="Curso Mais Vendido"
          value={bestSellingCourse?.title || '-'}
          description={bestSellingCourse ? `${bestSellingCourse.enrollmentCount} vendas` : undefined}
          icon={Trophy}
          loading={loading}
        />
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="none">Sem categoria</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="draft">Oculto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="flex justify-center mb-4 text-muted-foreground">
              <Document size={48} />
            </div>
            <p className="text-muted-foreground">Nenhum curso cadastrado ainda.</p>
            <Button className="mt-4" onClick={() => navigate('/admin/courses/new')}>
              <Plus size={16} />
              <span className="ml-1">Criar Primeiro Curso</span>
            </Button>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredCourses.map((course) => (
            <MobileCourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Curso</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Aulas</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course.id} className="cursor-pointer" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-10 h-12 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0 text-muted-foreground">
                          <Document size={16} />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{course.title}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getCategoryName(course.category_id) || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{course.lessonCount}</TableCell>
                  <TableCell className="font-medium">{formatPrice(course.price)}</TableCell>
                  <TableCell>
                    <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs">
                      {course.is_published ? 'Publicado' : 'Oculto'}
                    </Badge>
                    {course.is_featured && (
                      <Badge variant="outline" className="text-xs border-warning/30 text-warning ml-1">
                        ⭐
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <CourseActions course={course} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialog.open} onOpenChange={(open) => setLinkDialog({ open, course: open ? linkDialog.course : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Compartilhável</DialogTitle>
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
                  <div className="w-12 h-14 bg-muted rounded flex items-center justify-center text-muted-foreground">
                    <Document size={20} />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{linkDialog.course.title}</p>
                  <p className="text-sm text-muted-foreground">{formatPrice(linkDialog.course.price)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Link de Checkout</Label>
                <div className="flex gap-2">
                  <Input readOnly value={getCourseLink(linkDialog.course)} className="text-sm" />
                  <Button 
                    size="icon" 
                    onClick={() => linkDialog.course && handleCopyLink(linkDialog.course)}
                    variant={copied ? "default" : "outline"}
                  >
                    {copied ? <TickSquare size={16} /> : <Paper size={16} />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Link de Preview</Label>
                <div className="flex gap-2">
                  <Input readOnly value={getPreviewLink(linkDialog.course)} className="text-sm" />
                  <Button 
                    size="icon" 
                    onClick={() => {
                      navigator.clipboard.writeText(getPreviewLink(linkDialog.course!));
                      setCopiedPreview(true);
                      toast.success('Link de preview copiado!');
                      setTimeout(() => setCopiedPreview(false), 2000);
                    }}
                    variant={copiedPreview ? "default" : "outline"}
                  >
                    {copiedPreview ? <TickSquare size={16} /> : <Paper size={16} />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Course ID</Label>
                <div className="flex gap-2">
                  <Input readOnly value={linkDialog.course.id} className="text-sm font-mono" />
                  <Button 
                    size="icon" 
                    onClick={() => {
                      navigator.clipboard.writeText(linkDialog.course!.id);
                      setCopiedId(true);
                      toast.success('ID copiado!');
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    variant={copiedId ? "default" : "outline"}
                  >
                    {copiedId ? <TickSquare size={16} /> : <Paper size={16} />}
                  </Button>
                </div>
              </div>

              {!linkDialog.course.is_published && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <span className="text-warning-foreground mt-0.5 flex-shrink-0">
                    <Danger size={16} />
                  </span>
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
              <Danger size={20} />
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
                  <Delete size={16} />
                  <span className="ml-1">Excluir Permanentemente</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
