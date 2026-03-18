import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Building2, Mail, PlugZap, ImageIcon, Palette, Lock, Eye, EyeOff, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ImageUpload from '@/components/ImageUpload';
import {
  useSiteSettings,
  useUpdateSiteSettings,
  useApiKeys,
  useUpdateApiKeys,
  PRIMARY_COLOR_PRESETS,
  type SiteSettings,
  type ApiKeys,
} from '@/hooks/useSiteSettings';
import { cn } from '@/lib/utils';

function ReadOnlyInput({ value, tooltip }: { value: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2">
      <Input value={value} disabled className="bg-muted" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function MaskedApiInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useSiteSettings();
  const { data: apiKeys, isLoading: isLoadingKeys } = useApiKeys();
  const updateSettings = useUpdateSiteSettings();
  const updateApiKeys = useUpdateApiKeys();

  const [showPandaKey, setShowPandaKey] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);

  const form = useForm<SiteSettings>({ defaultValues: settings });
  const apiForm = useForm<ApiKeys>({ defaultValues: apiKeys });

  useEffect(() => {
    if (settings) form.reset(settings);
  }, [settings, form]);

  useEffect(() => {
    if (apiKeys) apiForm.reset(apiKeys);
  }, [apiKeys, apiForm]);

  const selectedColor = form.watch('primary_color') || 'green';

  const onSubmit = async (values: SiteSettings) => {
    try {
      const apiValues = apiForm.getValues();
      await Promise.all([
        updateSettings.mutateAsync(values),
        updateApiKeys.mutateAsync(apiValues),
      ]);
      toast.success('Configurações salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading || isLoadingKeys) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Configure a identidade, integrações e aparência da plataforma
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* ── Identidade da Plataforma ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <div className="flex items-center gap-3">
                <div className="icon-box-sm"><Globe /></div>
                <div>
                  <CardTitle className="text-base">Identidade da Plataforma</CardTitle>
                  <CardDescription>Nome, descrição e URLs usados em todo o sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="dashboard-card-content space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="platform_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da plataforma</FormLabel>
                    <FormControl>
                      <ReadOnlyInput value={field.value} tooltip="Definido pelo sistema Lovable" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="production_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de produção</FormLabel>
                    <FormControl>
                      <ReadOnlyInput value={field.value} tooltip="Definido pelo domínio do Lovable" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="platform_description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input placeholder="Plataforma de cursos online" {...field} /></FormControl>
                  <FormDescription>Meta description para SEO</FormDescription>
                </FormItem>
              )} />

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="footer_text" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto do rodapé</FormLabel>
                    <FormControl><Input placeholder="2026 © Empresa - Todos os direitos reservados" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="footer_credits" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Créditos do rodapé</FormLabel>
                    <FormControl>
                      <ReadOnlyInput value={field.value} tooltip="Sempre definido por Kanaflix Sistemas" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* ── Logo ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <div className="flex items-center gap-3">
                <div className="icon-box-sm"><Image /></div>
                <div>
                  <CardTitle className="text-base">Logo da Plataforma</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    Logo exibida na sidebar e em e-mails
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Use imagem horizontal (ex: 400×100px). PNG ou SVG com fundo transparente.</TooltipContent>
                    </Tooltip>
                  </CardDescription>
                </div>
              </div>
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
                    />
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── Cor Primária ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <div className="flex items-center gap-3">
                <div className="icon-box-sm"><Palette /></div>
                <div>
                  <CardTitle className="text-base">Cor Primária</CardTitle>
                  <CardDescription>Altera a cor principal do sistema inteiro</CardDescription>
                </div>
              </div>
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
                            'flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all',
                            selectedColor === key
                              ? 'border-foreground shadow-sm scale-105'
                              : 'border-transparent hover:border-border'
                          )}
                        >
                          <div
                            className="w-10 h-10 rounded-full border border-border shadow-sm"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span className="text-xs font-medium text-muted-foreground">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── E-mail Transacional (read-only) ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <div className="flex items-center gap-3">
                <div className="icon-box-sm"><Mail /></div>
                <div>
                  <CardTitle className="text-base">E-mail Transacional</CardTitle>
                  <CardDescription>Configurações do remetente definidas no Resend</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="dashboard-card-content">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="email_sender_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do remetente</FormLabel>
                    <FormControl>
                      <ReadOnlyInput value={field.value} tooltip="Configure no painel do Resend" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="email_sender_address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço do remetente</FormLabel>
                    <FormControl>
                      <ReadOnlyInput value={field.value} tooltip="Domínio deve estar verificado no Resend" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* ── Integrações Externas ── */}
          <Card>
            <CardHeader className="dashboard-card-header">
              <div className="flex items-center gap-3">
                <div className="icon-box-sm"><Code /></div>
                <div>
                  <CardTitle className="text-base">Integrações Externas</CardTitle>
                  <CardDescription>Tags e chaves de API de serviços terceiros</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="dashboard-card-content space-y-4">
              <FormField control={form.control} name="gtm_container_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Tag Manager - Container ID</FormLabel>
                  <FormControl><Input placeholder="GTM-XXXXXXX" {...field} /></FormControl>
                  <FormDescription>Deixe vazio para desativar o GTM</FormDescription>
                </FormItem>
              )} />

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={apiForm.control} name="pandavideo_api_key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pandavideo API Key</FormLabel>
                    <FormControl>
                      <MaskedApiInput
                        value={field.value}
                        onChange={field.onChange}
                        show={showPandaKey}
                        onToggle={() => setShowPandaKey(!showPandaKey)}
                        placeholder="Insira sua API Key do Pandavideo"
                      />
                    </FormControl>
                    <FormDescription>Chave para sincronizar vídeos do Pandavideo</FormDescription>
                  </FormItem>
                )} />
                <FormField control={apiForm.control} name="resend_api_key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resend API Key</FormLabel>
                    <FormControl>
                      <MaskedApiInput
                        value={field.value}
                        onChange={field.onChange}
                        show={showResendKey}
                        onToggle={() => setShowResendKey(!showResendKey)}
                        placeholder="Insira sua API Key do Resend"
                      />
                    </FormControl>
                    <FormDescription>Chave para envio de e-mails transacionais</FormDescription>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {updateSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
