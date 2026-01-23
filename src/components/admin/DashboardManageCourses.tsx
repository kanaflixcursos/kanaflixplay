import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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

interface Course {
  id: string;
  title: string;
  is_published: boolean;
}

export default function DashboardManageCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title, is_published')
      .order('created_at', { ascending: false })
      .limit(5);

    setCourses(data || []);
    setLoading(false);
  };

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
      setCourses(courses.filter(c => c.id !== courseId));
    }
    setDeletingCourseId(null);
    setDeleteConfirmText('');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Gerenciar Cursos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Gerenciar Cursos
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/courses">Ver Todos</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum curso cadastrado
          </p>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{course.title}</p>
                  <span className={`text-xs ${course.is_published ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {course.is_published ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/admin/courses/${course.id}/lessons`}>
                      <PlayCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/admin/courses/${course.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Curso</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Para confirmar, digite o nome do curso:
                          <span className="block font-semibold mt-2 text-foreground">"{course.title}"</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Input
                        placeholder="Digite o nome do curso"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                      />
                      <AlertDialogFooter>
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
