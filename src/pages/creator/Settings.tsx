import { useEffect, useState } from 'react';
import { useCreator } from '@/contexts/CreatorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PRIMARY_COLOR_PRESETS } from '@/hooks/useSiteSettings';
import ImageUpload from '@/components/ImageUpload';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface CreatorSettingsData {
  primary_color: string;
  logo_url: string;
  pandavideo_api_key: string;
  resend_api_key: string;
  sender_name: string;
  sender_email: string;
  gtm_container_id: string;
}

function SecretInput({ label, value, onChange, placeholder, savedValue, envConfigured }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; savedValue: string; envConfigured?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);
  const isConfigured = (!!savedValue || !!envConfigured) && !editing;

  if (isConfigured) {
    const sourceLabel = savedValue ? 'Secret já configurada' : 'Configurada via ambiente global';
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{sourceLabel}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(true); onChange(''); }}>Alterar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input value={value} onChange={e => onChange(e.target.value)} type={show ? 'text' : 'password'} placeholder={placeholder} className="pr-10" />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function CreatorSettingsPage() {
  const { creatorId, loading: creatorLoading } = useCreator();
  const [settings, setSettings] = useState<CreatorSettingsData>({
    primary_color: 'emerald',
    logo_url: '',
    pandavideo_api_key: '',
    resend_api_key: '',
    sender_name: '',
    sender_email: '',
    gtm_container_id: '',
  });
  const [savedKeys, setSavedKeys] = useState({ pandavideo_api_key: '', resend_api_key: '', gtm_container_id: '' });
  const [envSecrets, setEnvSecrets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!creatorId) return;

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('creator_settings')
        .select('primary_color, logo_url, pandavideo_api_key, resend_api_key, sender_name, sender_email, gtm_container_id')
        .eq('creator_id', creatorId)
        .single();

      if (data) {
        setSettings({
          primary_color: data.primary_color || 'emerald',
          logo_url: data.logo_url || '',
          pandavideo_api_key: '',
          resend_api_key: '',
          sender_name: data.sender_name || '',
          sender_email: data.sender_email || '',
          gtm_container_id: data.gtm_container_id || '',
        });
        setSavedKeys({
          pandavideo_api_key: data.pandavideo_api_key || '',
          resend_api_key: data.resend_api_key || '',
          gtm_container_id: data.gtm_container_id || '',
        });
      }
      setLoading(false);
    };

    const fetchEnvSecrets = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-secrets?creator_id=${creatorId}`,
          { headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        if (res.ok) {
          const json = await res.json();
          setEnvSecrets(json.effective || {});
        }
      } catch (e) {
        console.error('Failed to check env secrets:', e);
      }
    };

    fetchSettings();
    fetchEnvSecrets();
  }, [creatorId]);

  const handleSave = async () => {
    if (!creatorId) return;
    setSaving(true);

    const updateData: Record<string, any> = {
      primary_color: settings.primary_color,
      logo_url: settings.logo_url || null,
      sender_name: settings.sender_name || null,
      sender_email: settings.sender_email || null,
      gtm_container_id: settings.gtm_container_id || null,
    };
    if (settings.pandavideo_api_key) updateData.pandavideo_api_key = settings.pandavideo_api_key;
    if (settings.resend_api_key) updateData.resend_api_key = settings.resend_api_key;

    const { error } = await supabase
      .from('creator_settings')
      .update(updateData)
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
          <CardTitle className="text-lg">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <SecretInput
            label="Pandavideo API Key"
            value={settings.pandavideo_api_key}
            onChange={v => setSettings(s => ({ ...s, pandavideo_api_key: v }))}
            placeholder="Sua chave Pandavideo"
            savedValue={savedKeys.pandavideo_api_key}
            envConfigured={envSecrets.pandavideo}
          />
          <SecretInput
            label="Resend API Key"
            value={settings.resend_api_key}
            onChange={v => setSettings(s => ({ ...s, resend_api_key: v }))}
            placeholder="Sua chave Resend"
            savedValue={savedKeys.resend_api_key}
            envConfigured={envSecrets.resend}
          />
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
