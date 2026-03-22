import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCreator } from '@/contexts/CreatorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, BookOpen, Users, Search, Eye, Pencil, Clock } from 'lucide-react';

interface CreatorCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_published: boolean;
  price: number | null;
  created_at: string;
  lessonCount: number;
  enrollmentCount: number;
}

function formatPrice(cents: number | null): string {
  if (!cents || cents === 0) return 'Gratuito';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function CreatorCourses() {
  const { creatorId, loading: creatorLoading } = useCreator();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CreatorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!creatorId) return;

    const fetchCourses = async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, thumbnail_url, is_published, price, created_at')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      const enriched = await Promise.all(
        (data || []).map(async (course) => {
          const [lessonRes, enrollRes] = await Promise.all([
            supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', course.id),
            supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('course_id', course.id),
          ]);
          return { ...course, lessonCount: lessonRes.count || 0, enrollmentCount: enrollRes.count || 0 };
        })
      );

      setCourses(enriched);
      setLoading(false);
    };
    fetchCourses();
  }, [creatorId]);

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  if (creatorLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Cursos</h1>
          <p className="text-muted-foreground text-sm">{courses.length} curso{courses.length !== 1 ? 's' : ''} cadastrado{courses.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/creator/courses/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Curso
        </Button>
      </div>

      <Card>
        <div className="p-4 pb-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar curso..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="p-0 mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead className="text-center">Aulas</TableHead>
                <TableHead className="text-center">Alunos</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {courses.length === 0 ? 'Nenhum curso criado ainda' : 'Nenhum resultado'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(course => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 rounded bg-muted overflow-hidden shrink-0">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-sm line-clamp-1">{course.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{course.lessonCount}</TableCell>
                    <TableCell className="text-center text-sm">{course.enrollmentCount}</TableCell>
                    <TableCell className="text-sm">{formatPrice(course.price)}</TableCell>
                    <TableCell>
                      <Badge variant={course.is_published ? 'default' : 'outline'}>
                        {course.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/creator/courses/${course.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/creator/courses/${course.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
