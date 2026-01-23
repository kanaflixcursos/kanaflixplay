import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, BookOpen, Edit, Trash2, Eye, Loader2 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_published: boolean;
  created_at: string;
  lessonCount: number;
  enrollmentCount: number;
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    is_published: false,
  });

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

  const handleOpenDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title,
        description: course.description || '',
        thumbnail_url: course.thumbnail_url || '',
        is_published: course.is_published,
      });
    } else {
      setEditingCourse(null);
      setFormData({
        title: '',
        description: '',
        thumbnail_url: '',
        is_published: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }

    setSaving(true);

    if (editingCourse) {
      const { error } = await supabase
        .from('courses')
        .update(formData)
        .eq('id', editingCourse.id);

      if (error) {
        toast.error('Erro ao atualizar curso');
      } else {
        toast.success('Curso atualizado com sucesso!');
        fetchCourses();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('courses')
        .insert(formData);

      if (error) {
        toast.error('Erro ao criar curso');
      } else {
        toast.success('Curso criado com sucesso!');
        fetchCourses();
        setIsDialogOpen(false);
      }
    }

    setSaving(false);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cursos</h1>
          <p className="text-muted-foreground">Gerencie os cursos da plataforma</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Curso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? 'Editar Curso' : 'Novo Curso'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do curso abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do curso"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o curso..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnail">URL da Thumbnail</Label>
                <Input
                  id="thumbnail"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label htmlFor="published">Publicado</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Curso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-24 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-24 h-16 bg-muted rounded flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{course.title}</h3>
                      <Badge variant={course.is_published ? 'default' : 'secondary'}>
                        {course.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {course.description}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{course.lessonCount} aulas</span>
                      <span>{course.enrollmentCount} alunos</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Aulas
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenDialog(course)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleTogglePublish(course)}
                    >
                      {course.is_published ? '📤' : '📥'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(course.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
