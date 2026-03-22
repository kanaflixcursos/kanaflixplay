import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Plus, Pencil, Users, BookOpen, ShoppingCart, Search } from 'lucide-react';

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
  course_count?: number;
  enrollment_count?: number;
}

interface CreatorFormData {
  name: string;
  slug: string;
  description: string;
  user_email: string;
  status: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'secondary' },
  active: { label: 'Ativo', variant: 'default' },
  suspended: { label: 'Suspenso', variant: 'destructive' },
};

export default function Creators() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [form, setForm] = useState<CreatorFormData>({
    name: '', slug: '', description: '', user_email: '', status: 'active',
  });

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with profile and stats
      const enriched = await Promise.all(
        (data || []).map(async (creator) => {
          const [profileRes, courseCountRes, enrollmentCountRes] = await Promise.all([
            supabase.from('profiles').select('full_name, email, avatar_url').eq('user_id', creator.user_id).single(),
            supabase.from('courses').select('*', { count: 'exact', head: true }).eq('creator_id', creator.id),
            supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('creator_id', creator.id),
          ]);
          return {
            ...creator,
            profile: profileRes.data || undefined,
            course_count: courseCountRes.count || 0,
            enrollment_count: enrollmentCountRes.count || 0,
          } as Creator;
        })
      );
      return enriched;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: CreatorFormData) => {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', formData.user_email.toLowerCase().trim())
        .single();

      if (profileError || !profile) {
        throw new Error('Usuário não encontrado com esse email. O usuário precisa ter uma conta cadastrada.');
      }

      // Check if already a creator
      const { data: existing } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (existing) {
        throw new Error('Este usuário já é um criador.');
      }

      // Create the creator
      const { error: createError } = await supabase
        .from('creators')
        .insert({
          user_id: profile.user_id,
          name: formData.name,
          slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          description: formData.description || null,
          status: formData.status,
        });

      if (createError) throw createError;

      // Add 'creator' role
      await supabase
        .from('user_roles')
        .insert({ user_id: profile.user_id, role: 'creator' as any })
        .select();

      // Create default creator_settings
      const { data: newCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', profile.user_id)
        .single();

      if (newCreator) {
        await supabase
          .from('creator_settings')
          .insert({ creator_id: newCreator.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] });
      toast.success('Criador adicionado com sucesso!');
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreatorFormData> }) => {
      const updateData: Record<string, any> = {};
      if (data.name) updateData.name = data.name;
      if (data.slug) updateData.slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.status) updateData.status = data.status;

      const { error } = await supabase
        .from('creators')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] });
      toast.success('Criador atualizado!');
      setDialogOpen(false);
      setEditingCreator(null);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', user_email: '', status: 'active' });
  };

  const openEdit = (creator: Creator) => {
    setEditingCreator(creator);
    setForm({
      name: creator.name,
      slug: creator.slug,
      description: creator.description || '',
      user_email: creator.profile?.email || '',
      status: creator.status,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingCreator(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.slug) {
      toast.error('Nome e slug são obrigatórios.');
      return;
    }
    if (editingCreator) {
      updateMutation.mutate({ id: editingCreator.id, data: form });
    } else {
      if (!form.user_email) {
        toast.error('Email do usuário é obrigatório.');
        return;
      }
      createMutation.mutate(form);
    }
  };

  const filtered = creators.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    c.profile?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Criadores</h1>
          <p className="text-muted-foreground text-sm">Gerencie os criadores de conteúdo da plataforma</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
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
                    <TableRow key={creator.id}>
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
                        <Button variant="ghost" size="icon" onClick={() => openEdit(creator)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCreator ? 'Editar Criador' : 'Novo Criador'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!editingCreator && (
              <div className="space-y-2">
                <Label>Email do Usuário *</Label>
                <Input
                  placeholder="email@exemplo.com"
                  value={form.user_email}
                  onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">O usuário já deve ter uma conta cadastrada na plataforma.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome do Criador *</Label>
              <Input
                placeholder="Nome da marca ou canal"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL) *</Label>
              <Input
                placeholder="meu-canal"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              />
              <p className="text-xs text-muted-foreground">/store/{form.slug || 'meu-canal'}</p>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Breve descrição do criador..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingCreator ? 'Salvar Alterações' : 'Criar Criador'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
