import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { BookOpen, PlayCircle, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  title: string;
  is_published: boolean;
}

async function fetchRecentCourses(): Promise<Course[]> {
  const { data } = await supabase
    .from('courses')
    .select('id, title, is_published')
    .order('created_at', { ascending: false })
    .limit(5);
  return data || [];
}

export default function DashboardManageCourses() {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', 'dashboard-recent'],
    queryFn: fetchRecentCourses,
    staleTime: 1000 * 60 * 2,
  });

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (deleteConfirmText !== courseTitle) {
      toast.error('O nome do curso não confere');
      return;
    }

    setDeletingCourseId(courseId);
    const { error } = await supabase.from('courses').delete().eq('id', courseId);

    if (error) {
      toast.error('Erro ao excluir curso');
    } else {
      toast.success('Curso excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    }
    setDeletingCourseId(null);
    setDeleteConfirmText('');
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Gerenciar Cursos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6 sm:py-8 p-4 sm:p-6 pt-0">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span className="truncate">Cursos</span>
        </CardTitle>
        <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm h-8" asChild>
          <Link to="/admin/courses">Ver Todos</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum curso cadastrado
          </p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">{course.title}</p>
                  <span className={`text-[10px] sm:text-xs ${course.is_published ? 'text-success' : 'text-muted-foreground'}`}>
                    {course.is_published ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" asChild>
                    <Link to={`/admin/courses/${course.id}/lessons`}>
                      <PlayCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" asChild>
                    <Link to={`/admin/courses/${course.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Curso</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Para confirmar, digite o nome do curso:
                          <span className="block font-semibold mt-2 text-foreground break-words">"{course.title}"</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Input
                        placeholder="Digite o nome do curso"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                      />
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(course.id, course.title)}
                          disabled={deletingCourseId === course.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingCourseId === course.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Excluir'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
