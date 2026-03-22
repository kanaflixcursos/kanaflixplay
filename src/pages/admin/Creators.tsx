import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Pencil, Users, BookOpen, Search } from 'lucide-react';

interface Creator {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null; avatar_url: string | null };
  course_count: number;
  enrollment_count: number;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'secondary' },
  active: { label: 'Ativo', variant: 'default' },
  suspended: { label: 'Suspenso', variant: 'destructive' },
};

export default function Creators() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Batch: fetch all profiles in one query
      const userIds = data.map(c => c.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Batch: fetch counts in two queries instead of 2*N
      const creatorIds = data.map(c => c.id);
      const [coursesRes, enrollmentsRes] = await Promise.all([
        supabase.from('courses').select('creator_id').in('creator_id', creatorIds),
        supabase.from('course_enrollments').select('creator_id').in('creator_id', creatorIds),
      ]);

      const courseCountMap = new Map<string, number>();
      (coursesRes.data || []).forEach(c => {
        courseCountMap.set(c.creator_id, (courseCountMap.get(c.creator_id) || 0) + 1);
      });

      const enrollmentCountMap = new Map<string, number>();
      (enrollmentsRes.data || []).forEach(e => {
        enrollmentCountMap.set(e.creator_id, (enrollmentCountMap.get(e.creator_id) || 0) + 1);
      });

      return data.map(creator => ({
        ...creator,
        profile: profileMap.get(creator.user_id) || undefined,
        course_count: courseCountMap.get(creator.id) || 0,
        enrollment_count: enrollmentCountMap.get(creator.id) || 0,
      })) as Creator[];
    },
  });

  const filtered = creators.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    c.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.profile?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Criadores</h1>
          <p className="text-muted-foreground text-sm">Gerencie os criadores de conteúdo da plataforma</p>
        </div>
        <Button onClick={() => navigate('/admin/creators/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Criador
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar criador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criador</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Cursos</TableHead>
                <TableHead className="text-center">Alunos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum criador encontrado</TableCell>
                </TableRow>
              ) : (
                filtered.map(creator => {
                  const st = statusLabels[creator.status] || statusLabels.pending;
                  return (
                    <TableRow key={creator.id} className="cursor-pointer" onClick={() => navigate(`/admin/creators/${creator.id}/edit`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={creator.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{(creator.profile?.full_name || creator.name).substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{creator.profile?.full_name || '—'}</p>
                            <p className="text-xs text-muted-foreground">{creator.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">/{creator.slug}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          {creator.course_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {creator.enrollment_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); navigate(`/admin/creators/${creator.id}/edit`); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
