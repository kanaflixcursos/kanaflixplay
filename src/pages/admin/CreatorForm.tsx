import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Building2, Store, ImageIcon, Palette, PlugZap, Mail,
  Lock, Eye, EyeOff, Info, Trash2, Users, Search, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ImageUpload from '@/components/ImageUpload';
import { PRIMARY_COLOR_PRESETS } from '@/hooks/useSiteSettings';
import { cn } from '@/lib/utils';

interface CreatorFormValues {
  user_email: string;
  business_name: string;
  slug: string;
  description: string;
  status: string;
  // Branding
  logo_url: string;
  primary_color: string;
  // APIs
  pandavideo_api_key: string;
  resend_api_key: string;
  sender_name: string;
  sender_email: string;
  gtm_container_id: string;
}

const DEFAULT_VALUES: CreatorFormValues = {
  user_email: '',
  business_name: '',
  slug: '',
  description: '',
  status: 'active',
  logo_url: '',
  primary_color: 'green',
  pandavideo_api_key: '',
  resend_api_key: '',
  sender_name: '',
  sender_email: '',
  gtm_container_id: '',
};

function MaskedApiInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <Input value={value} onChange={e => onChange(e.target.value)} type={show ? 'text' : 'password'} placeholder={placeholder} className="pr-10" />
      <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SecretField({ label, description, value, onChange, placeholder, savedValue }: {
  label: string; description: string; value: string; onChange: (v: string) => void; placeholder: string; savedValue: string;
}) {
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);
  const isConfigured = !!savedValue && !editing;

  if (isConfigured) {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Secret já configurada</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(true); onChange(''); }}>Alterar</Button>
        </div>
        <FormDescription>{description}</FormDescription>
      </FormItem>
    );
  }

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <MaskedApiInput value={value} onChange={onChange} show={show} onToggle={() => setShow(!show)} placeholder={placeholder} />
      <FormDescription>{description}</FormDescription>
    </FormItem>
  );
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null; avatar_url: string | null };
}

interface EnrolledStudent {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export default function CreatorForm() {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!creatorId;

  const [savedApiKeys, setSavedApiKeys] = useState({ pandavideo_api_key: '', resend_api_key: '', gtm_container_id: '' });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);

  const form = useForm<CreatorFormValues>({ defaultValues: DEFAULT_VALUES });
  const selectedColor = form.watch('primary_color') || 'green';

  // Fetch existing creator data
  const { data: creatorData, isLoading } = useQuery({
    queryKey: ['admin-creator-detail', creatorId],
    queryFn: async () => {
      if (!creatorId) return null;
      const { data: creator, error } = await supabase
        .from('creators')
        .select('*')
        .eq('id', creatorId)
        .single();
      if (error) throw error;

      const [profileRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email, avatar_url').eq('user_id', creator.user_id).single(),
        supabase.from('creator_settings').select('*').eq('creator_id', creatorId).single(),
      ]);

      return { creator, profile: profileRes.data, settings: settingsRes.data };
    },
    enabled: isEditing,
  });

  // Fetch team members (batched profile lookup)
  const { data: teamMembers = [], refetch: refetchTeam } = useQuery({
    queryKey: ['creator-team', creatorId],
    queryFn: async () => {
      if (!creatorId) return [];
      const { data, error } = await supabase
        .from('creator_admins')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return data.map(member => ({
        ...member,
        profile: profileMap.get(member.user_id) || undefined,
      })) as TeamMember[];
    },
    enabled: isEditing,
  });

  // Fetch enrolled students for this creator (for team selection)
  const { data: enrolledStudents = [] } = useQuery({
    queryKey: ['creator-enrolled-students', creatorId],
    queryFn: async () => {
      if (!creatorId) return [];
      // Get distinct user_ids enrolled in this creator's courses
      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select('user_id')
        .eq('creator_id', creatorId);
      if (error) throw error;

      const uniqueUserIds = [...new Set((enrollments || []).map(e => e.user_id))];
      if (uniqueUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', uniqueUserIds);

      return (profiles || []) as EnrolledStudent[];
    },
    enabled: isEditing,
  });

  // Filter enrolled students: exclude owner, existing team members, and apply search
  const teamMemberIds = teamMembers.map(m => m.user_id);
  const ownerUserId = creatorData?.creator?.user_id;
  const filteredStudents = enrolledStudents.filter(s => {
    if (s.user_id === ownerUserId) return false;
    if (teamMemberIds.includes(s.user_id)) return false;
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  });

  // Populate form when editing
  useEffect(() => {
    if (!creatorData) return;
    const { creator, profile, settings } = creatorData;
    form.reset({
      user_email: profile?.email || '',
      business_name: creator.name,
      slug: creator.slug,
      description: creator.description || '',
      status: creator.status,
      logo_url: settings?.logo_url || '',
      primary_color: settings?.primary_color || 'green',
      pandavideo_api_key: '',
      resend_api_key: '',
      sender_name: settings?.sender_name || '',
      sender_email: settings?.sender_email || '',
      gtm_container_id: settings?.gtm_container_id || '',
    });
    setSavedApiKeys({
      pandavideo_api_key: settings?.pandavideo_api_key || '',
      resend_api_key: settings?.resend_api_key || '',
      gtm_container_id: settings?.gtm_container_id || '',
    });
  }, [creatorData, form]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (values: CreatorFormValues) => {
      if (isEditing && creatorData) {
        // Update creator
        const { error: updateError } = await supabase
          .from('creators')
          .update({
            name: values.business_name,
            slug: values.slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            description: values.description || null,
            status: values.status,
          })
          .eq('id', creatorId);
        if (updateError) throw updateError;

        // Update creator_settings
        const settingsUpdate: Record<string, any> = {
          logo_url: values.logo_url || null,
          primary_color: values.primary_color || 'green',
          platform_name: values.business_name || null,
          platform_description: values.description || null,
          production_url: values.slug ? `https://${values.slug}.kanaflixplay.com` : null,
          sender_name: values.sender_name || null,
          sender_email: values.sender_email || null,
          gtm_container_id: values.gtm_container_id || null,
        };
        if (values.pandavideo_api_key) settingsUpdate.pandavideo_api_key = values.pandavideo_api_key;
        if (values.resend_api_key) settingsUpdate.resend_api_key = values.resend_api_key;

        const { error: settingsError } = await supabase
          .from('creator_settings')
          .update(settingsUpdate)
          .eq('creator_id', creatorId);
        if (settingsError) throw settingsError;
      } else {
        // Create new creator
        if (!values.user_email) throw new Error('Email do criador é obrigatório');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', values.user_email.toLowerCase().trim())
          .single();
        if (profileError || !profile) throw new Error('Usuário não encontrado. Precisa ter conta cadastrada.');

        const { data: existing } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', profile.user_id)
          .maybeSingle();
        if (existing) throw new Error('Este usuário já é um criador.');

        const { error: createError } = await supabase
          .from('creators')
          .insert({
            user_id: profile.user_id,
            name: values.business_name,
            slug: values.slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            description: values.description || null,
            status: values.status,
          });
        if (createError) throw createError;

        // Add creator role
        await supabase.from('user_roles').insert({ user_id: profile.user_id, role: 'creator' as any });

        // Create settings
        const { data: newCreator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', profile.user_id)
          .single();

        if (newCreator) {
          await supabase.from('creator_settings').insert({
            creator_id: newCreator.id,
            logo_url: values.logo_url || null,
            primary_color: values.primary_color || 'green',
            platform_name: values.business_name || null,
            platform_description: values.description || null,
            production_url: values.slug ? `https://${values.slug}.kanaflixplay.com` : null,
            sender_name: values.sender_name || null,
            sender_email: values.sender_email || null,
            gtm_container_id: values.gtm_container_id || null,
            pandavideo_api_key: values.pandavideo_api_key || null,
            resend_api_key: values.resend_api_key || null,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] });
      toast.success(isEditing ? 'Criador atualizado!' : 'Criador criado com sucesso!');
      navigate('/admin/creators');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Add team member by user_id
  const addTeamMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error: insertError } = await supabase
        .from('creator_admins')
        .insert({ creator_id: creatorId!, user_id: userId });
      if (insertError) {
        if (insertError.code === '23505') throw new Error('Este usuário já faz parte da equipe.');
        throw insertError;
      }
    },
    onSuccess: () => {
      toast.success('Membro adicionado à equipe!');
      setStudentSearch('');
      setStudentPopoverOpen(false);
      refetchTeam();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Remove team member
  const removeTeamMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('creator_admins').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Membro removido da equipe.');
      refetchTeam();
    },
    onError: () => toast.error('Erro ao remover membro.'),
  });

  const onSubmit = (values: CreatorFormValues) => saveMutation.mutate(values);

  if (isEditing && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/creators')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditing ? 'Editar Criador' : 'Novo Criador'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing ? 'Atualize dados e branding do criador' : 'Configure o novo criador de conteúdo'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* ── Dados do Usuário ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <CardTitle className="flex items-center gap-3 text-left">
                <div className="icon-box"><User /></div>
                <div>
                  <span className="text-base">Dados do Usuário</span>
                  <p className="text-sm text-muted-foreground font-normal">Pessoa responsável pelo negócio</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="dashboard-card-content space-y-4">
              {!isEditing ? (
                <FormField control={form.control} name="user_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do Criador (pessoa) *</FormLabel>
                    <FormControl><Input placeholder="email@exemplo.com" {...field} /></FormControl>
                    <FormDescription>O usuário já deve ter uma conta cadastrada na plataforma.</FormDescription>
                  </FormItem>
                )} />
              ) : (
                <FormItem>
                  <FormLabel>Criador (pessoa)</FormLabel>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={creatorData?.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(creatorData?.profile?.full_name || '?').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{creatorData?.profile?.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{creatorData?.profile?.email}</p>
                    </div>
                  </div>
                </FormItem>
              )}
            </CardContent>
          </Card>

          {/* ── Identidade da Loja ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <CardTitle className="flex items-center gap-3 text-left">
                <div className="icon-box"><Store /></div>
                <div>
                  <span className="text-base">Identidade da Loja</span>
                  <p className="text-sm text-muted-foreground font-normal">Nome, URL e descrição exibidos publicamente</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="dashboard-card-content space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="business_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Negócio *</FormLabel>
                    <FormControl><Input placeholder="Nome da marca ou empresa" {...field} /></FormControl>
                    <FormDescription>Nome exibido publicamente. Apenas o admin master pode alterar.</FormDescription>
                  </FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (URL) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="meu-negocio"
                        {...field}
                        onChange={e => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      />
                    </FormControl>
                    <FormDescription>/store/{field.value || 'meu-negocio'} — Apenas o admin master pode alterar.</FormDescription>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea placeholder="Breve descrição do negócio (também usada como meta description)" rows={3} {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── Branding ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo */}
            <Card>
              <CardHeader className="dashboard-card-header">
                <CardTitle className="flex items-center gap-3 text-left">
                  <div className="icon-box"><ImageIcon /></div>
                  <div>
                    <span className="text-base">Logo do Negócio</span>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-normal">
                      <span>Exibida na loja e em e-mails</span>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 cursor-help" /></TooltipTrigger>
                        <TooltipContent>Use imagem horizontal (ex: 400×100px). PNG ou SVG com fundo transparente.</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="dashboard-card-content">
                <FormField control={form.control} name="logo_url" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        bucket="banners"
                        folder="logos"
                        aspectRatio="4/1"
                        maxWidth={800}
                        maxHeight={200}
                        label="Enviar Logo"
                      />
                    </FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Primary Color */}
            <Card>
              <CardHeader className="dashboard-card-header">
                <CardTitle className="flex items-center gap-3 text-left">
                  <div className="icon-box"><Palette /></div>
                  <div>
                    <span className="text-base">Cor Primária</span>
                    <p className="text-sm text-muted-foreground font-normal">Cor principal da loja do criador</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="dashboard-card-content">
                <FormField control={form.control} name="primary_color" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(PRIMARY_COLOR_PRESETS).map(([key, preset]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => field.onChange(key)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all',
                              selectedColor === key
                                ? 'border-foreground shadow-sm scale-105'
                                : 'border-transparent hover:border-border'
                            )}
                          >
                            <div className="h-10 w-10 rounded-full border border-border shadow-sm" style={{ backgroundColor: preset.hex }} />
                            <span className="text-xs font-medium text-muted-foreground">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          {/* ── E-mail Transacional ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <CardTitle className="flex items-center gap-3 text-left">
                <div className="icon-box"><Mail /></div>
                <div>
                  <span className="text-base">E-mail Transacional</span>
                  <p className="text-sm text-muted-foreground font-normal">Remetente de e-mails do criador</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="dashboard-card-content">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="sender_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do remetente</FormLabel>
                    <FormControl><Input placeholder="Minha Marca" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="sender_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do remetente</FormLabel>
                    <FormControl><Input placeholder="noreply@exemplo.com" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* ── Integrações ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <CardTitle className="flex items-center gap-3 text-left">
                <div className="icon-box"><PlugZap /></div>
                <div>
                  <span className="text-base">Integrações Externas</span>
                  <p className="text-sm text-muted-foreground font-normal">Tags e chaves de API do criador</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="dashboard-card-content space-y-4">
              <FormField control={form.control} name="gtm_container_id" render={({ field }) => (
                <SecretField
                  label="Google Tag Manager - Container ID"
                  description="Deixe vazio para desativar o GTM"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="GTM-XXXXXXX"
                  savedValue={savedApiKeys.gtm_container_id}
                />
              )} />
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="pandavideo_api_key" render={({ field }) => (
                  <SecretField
                    label="Pandavideo API Key"
                    description="Chave para sincronizar vídeos"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="API Key do Pandavideo"
                    savedValue={savedApiKeys.pandavideo_api_key}
                  />
                )} />
                <FormField control={form.control} name="resend_api_key" render={({ field }) => (
                  <SecretField
                    label="Resend API Key"
                    description="Chave para e-mails transacionais"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="API Key do Resend"
                    savedValue={savedApiKeys.resend_api_key}
                  />
                )} />
              </div>
            </CardContent>
          </Card>

          {/* ── Equipe (only when editing) ── */}
          {isEditing && (
            <Card>
              <CardHeader className="dashboard-card-header">
                <CardTitle className="flex items-center gap-3 text-left">
                  <div className="icon-box"><Users /></div>
                  <div>
                    <span className="text-base">Equipe Administrativa</span>
                    <p className="text-sm text-muted-foreground font-normal">
                      Conceda acesso administrativo a alunos cadastrados neste negócio
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="dashboard-card-content space-y-4">
                {/* Owner */}
                {creatorData?.profile && (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={creatorData.profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(creatorData.profile.full_name || '?').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{creatorData.profile.full_name}</p>
                        <p className="text-xs text-muted-foreground">{creatorData.profile.email}</p>
                      </div>
                    </div>
                    <Badge variant="default">Dono</Badge>
                  </div>
                )}

                {/* Team members */}
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(member.profile?.full_name || '?').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.profile?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Admin</Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.profile?.full_name} perderá acesso administrativo a este negócio.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeTeamMember.mutate(member.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}

                {/* Add member - select from enrolled students */}
                <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="gap-2 w-full justify-start text-muted-foreground font-normal">
                      <Users className="h-4 w-4" />
                      Selecionar aluno para adicionar à equipe...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar aluno..."
                          value={studentSearch}
                          onChange={e => setStudentSearch(e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      {filteredStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {enrolledStudents.length === 0
                            ? 'Nenhum aluno matriculado neste negócio'
                            : 'Nenhum aluno encontrado'}
                        </p>
                      ) : (
                        filteredStudents.map(student => (
                          <button
                            key={student.user_id}
                            type="button"
                            onClick={() => addTeamMember.mutate(student.user_id)}
                            disabled={addTeamMember.isPending}
                            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent text-left transition-colors"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={student.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {(student.full_name || '?').substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{student.full_name || '—'}</p>
                              <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Apenas alunos matriculados neste negócio podem ser adicionados como membros da equipe.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Criador'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
