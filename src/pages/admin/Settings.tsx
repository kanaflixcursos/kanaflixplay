import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Mail, Code, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteSettings, useUpdateSiteSettings, type SiteSettings } from '@/hooks/useSiteSettings';

export default function Settings() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();

  const form = useForm<SiteSettings>({
    defaultValues: settings,
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = async (values: SiteSettings) => {
    try {
      await updateSettings.mutateAsync(values);
      toast.success('Configurações salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Configure a identidade, integrações e URLs da plataforma
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Branding */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Identidade da Plataforma</CardTitle>
                </div>
                <CardDescription>Nome, descrição e URLs usados em todo o sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="platform_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da plataforma</FormLabel>
                      <FormControl><Input placeholder="Kanaflix Play" {...field} /></FormControl>
                      <FormDescription>Exibido no título, rodapé e e-mails</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="production_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de produção</FormLabel>
                      <FormControl><Input placeholder="https://cursos.exemplo.com.br" {...field} /></FormControl>
                      <FormDescription>Usada em links de e-mail e redirecionamentos</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="platform_description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Input placeholder="Plataforma de cursos online" {...field} /></FormControl>
                    <FormDescription>Meta description para SEO</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="footer_text" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto do rodapé</FormLabel>
                      <FormControl><Input placeholder="2026 © Empresa - Todos os direitos reservados" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="footer_credits" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Créditos do rodapé</FormLabel>
                      <FormControl><Input placeholder="Feito por Empresa Sistemas" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">E-mail Transacional</CardTitle>
                </div>
                <CardDescription>Configurações do remetente de e-mails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="email_sender_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do remetente</FormLabel>
                      <FormControl><Input placeholder="Minha Plataforma" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email_sender_address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço do remetente</FormLabel>
                      <FormControl><Input type="email" placeholder="noreply@exemplo.com.br" {...field} /></FormControl>
                      <FormDescription>Domínio deve estar verificado no Resend</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Integrations */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Integrações Externas</CardTitle>
                </div>
                <CardDescription>Tags e scripts de terceiros</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="gtm_container_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Tag Manager - Container ID</FormLabel>
                    <FormControl><Input placeholder="GTM-XXXXXXX" {...field} /></FormControl>
                    <FormDescription>Deixe vazio para desativar o GTM</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* SEO / Social */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">SEO e Redes Sociais</CardTitle>
                </div>
                <CardDescription>Meta tags e Open Graph</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="og_image_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem OG (Open Graph)</FormLabel>
                    <FormControl><Input placeholder="https://exemplo.com/og-image.png" {...field} /></FormControl>
                    <FormDescription>Imagem exibida ao compartilhar links nas redes sociais</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="twitter_handle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter/X Handle</FormLabel>
                    <FormControl><Input placeholder="@SuaEmpresa" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateSettings.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {updateSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
