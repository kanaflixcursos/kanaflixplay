import { useState, useEffect } from 'react';
import { useCreator } from '@/contexts/CreatorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, BookOpen } from 'lucide-react';

interface CreatorStudent {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  enrolled_courses: number;
  enrolled_at: string;
}

export default function CreatorStudents() {
  const { creatorId, loading: creatorLoading } = useCreator();
  const [students, setStudents] = useState<CreatorStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!creatorId) return;

    const fetchStudents = async () => {
      // Get enrollments for this creator
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('user_id, enrolled_at')
        .eq('creator_id', creatorId)
        .order('enrolled_at', { ascending: false });

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      // Group by user_id
      const userMap = new Map<string, { count: number; earliest: string }>();
      enrollments.forEach(e => {
        const existing = userMap.get(e.user_id);
        if (!existing) {
          userMap.set(e.user_id, { count: 1, earliest: e.enrolled_at });
        } else {
          existing.count++;
          if (e.enrolled_at < existing.earliest) existing.earliest = e.enrolled_at;
        }
      });

      const userIds = Array.from(userMap.keys());

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      const result: CreatorStudent[] = userIds.map(uid => {
        const profile = profiles?.find(p => p.user_id === uid);
        const info = userMap.get(uid)!;
        return {
          user_id: uid,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          enrolled_courses: info.count,
          enrolled_at: info.earliest,
        };
      });

      setStudents(result);
      setLoading(false);
    };
    fetchStudents();
  }, [creatorId]);

  const filtered = students.filter(s =>
    (s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meus Alunos</h1>
        <p className="text-muted-foreground text-sm">{students.length} aluno{students.length !== 1 ? 's' : ''} matriculado{students.length !== 1 ? 's' : ''}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead className="text-center">Cursos</TableHead>
                <TableHead>Matriculado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {students.length === 0 ? 'Nenhum aluno matriculado' : 'Nenhum resultado'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(student => (
                  <TableRow key={student.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(student.full_name || '?').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{student.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        {student.enrolled_courses}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(student.enrolled_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
