import { useEffect, useState } from 'react';
import { useCreator } from '@/contexts/CreatorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PRIMARY_COLOR_PRESETS } from '@/hooks/useSiteSettings';
import ImageUpload from '@/components/ImageUpload';

interface CreatorSettingsData {
  primary_color: string;
  platform_name: string;
  platform_description: string;
  logo_url: string;
  pandavideo_api_key: string;
  resend_api_key: string;
  sender_name: string;
  sender_email: string;
  gtm_container_id: string;
  production_url: string;
}

export default function CreatorSettingsPage() {
  const { creatorId, loading: creatorLoading } = useCreator();
  const [settings, setSettings] = useState<CreatorSettingsData>({
    primary_color: 'emerald',
    platform_name: '',
    platform_description: '',
    logo_url: '',
    pandavideo_api_key: '',
    resend_api_key: '',
    sender_name: '',
    sender_email: '',
    gtm_container_id: '',
    production_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!creatorId) return;

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('creator_settings')
        .select('*')
        .eq('creator_id', creatorId)
        .single();

      if (data) {
        setSettings({
          primary_color: data.primary_color || 'emerald',
          platform_name: data.platform_name || '',
          platform_description: data.platform_description || '',
          logo_url: data.logo_url || '',
          pandavideo_api_key: data.pandavideo_api_key || '',
          resend_api_key: data.resend_api_key || '',
          sender_name: data.sender_name || '',
          sender_email: data.sender_email || '',
          gtm_container_id: data.gtm_container_id || '',
          production_url: data.production_url || '',
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [creatorId]);

  const handleSave = async () => {
    if (!creatorId) return;
    setSaving(true);

    const { error } = await supabase
      .from('creator_settings')
      .update({
        primary_color: settings.primary_color,
        platform_name: settings.platform_name || null,
        platform_description: settings.platform_description || null,
        logo_url: settings.logo_url || null,
        pandavideo_api_key: settings.pandavideo_api_key || null,
        resend_api_key: settings.resend_api_key || null,
        sender_name: settings.sender_name || null,
        sender_email: settings.sender_email || null,
        gtm_container_id: settings.gtm_container_id || null,
        production_url: settings.production_url || null,
      })
      .eq('creator_id', creatorId);

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar configurações.');
    } else {
      toast.success('Configurações salvas!');
    }
  };

  if (creatorLoading || loading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm">Personalize sua loja e integrações</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identidade da Loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Plataforma</Label>
            <Input value={settings.platform_name} onChange={e => setSettings(s => ({ ...s, platform_name: e.target.value }))} placeholder="Minha Plataforma" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={settings.platform_description} onChange={e => setSettings(s => ({ ...s, platform_description: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <ImageUpload bucket="banners" value={settings.logo_url} onChange={url => setSettings(s => ({ ...s, logo_url: url }))} />
          </div>
          <div className="space-y-2">
            <Label>Cor Primária</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRIMARY_COLOR_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${settings.primary_color === key ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: preset.hex }}
                  onClick={() => setSettings(s => ({ ...s, primary_color: key }))}
                  title={preset.label}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>URL de Produção</Label>
            <Input value={settings.production_url} onChange={e => setSettings(s => ({ ...s, production_url: e.target.value }))} placeholder="https://meusite.com.br" />
          </div>
          <div className="space-y-2">
            <Label>GTM Container ID</Label>
            <Input value={settings.gtm_container_id} onChange={e => setSettings(s => ({ ...s, gtm_container_id: e.target.value }))} placeholder="GTM-XXXXXXX" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integrações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pandavideo API Key</Label>
            <Input type="password" value={settings.pandavideo_api_key} onChange={e => setSettings(s => ({ ...s, pandavideo_api_key: e.target.value }))} placeholder="Sua chave Pandavideo" />
          </div>
          <div className="space-y-2">
            <Label>Resend API Key</Label>
            <Input type="password" value={settings.resend_api_key} onChange={e => setSettings(s => ({ ...s, resend_api_key: e.target.value }))} placeholder="Sua chave Resend" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Remetente</Label>
              <Input value={settings.sender_name} onChange={e => setSettings(s => ({ ...s, sender_name: e.target.value }))} placeholder="Minha Marca" />
            </div>
            <div className="space-y-2">
              <Label>Email do Remetente</Label>
              <Input value={settings.sender_email} onChange={e => setSettings(s => ({ ...s, sender_email: e.target.value }))} placeholder="contato@meusite.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  );
}
