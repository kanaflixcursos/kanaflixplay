import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, BookOpen, Edit, Trash2, Eye, Loader2, Folder, RefreshCw, MoreHorizontal } from 'lucide-react';
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

  const handleDelete = async (courseId: string) => {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      toast.error('Erro ao excluir curso');
    } else {
      toast.success('Curso excluído com sucesso!');
      fetchCourses();
    }
  };

  const handleTogglePublish = async (course: Course) => {
    const { error } = await supabase
      .from('courses')
      .update({ is_published: !course.is_published })
      .eq('id', course.id);

    if (error) {
      toast.error('Erro ao alterar status');
    } else {
      toast.success(course.is_published ? 'Curso despublicado' : 'Curso publicado');
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

  const CourseActions = ({ course }: { course: Course }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Aulas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleTogglePublish(course)}>
          {course.is_published ? '📤 Despublicar' : '📥 Publicar'}
        </DropdownMenuItem>
        {course.pandavideo_folder_id && (
          <DropdownMenuItem 
            onClick={() => handleSyncCourse(course.id)}
            disabled={syncing === course.id}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing === course.id ? 'animate-spin' : ''}`} />
            Sincronizar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleDelete(course.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
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
                        {course.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
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
                    <div className="flex items-center gap-2">
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
                        onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                        title="Editar curso"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleTogglePublish(course)}
                        title={course.is_published ? 'Despublicar' : 'Publicar'}
                      >
                        {course.is_published ? '📤' : '📥'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(course.id)}
                        title="Excluir curso"
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
    </div>
  );
}
