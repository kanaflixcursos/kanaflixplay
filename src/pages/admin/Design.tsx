import { useState } from 'react';
import { useDesign, FONT_OPTIONS, COLOR_PRESETS } from '@/contexts/DesignContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, Palette, Type, ImageIcon, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';

export default function AdminDesign() {
  const { settings, updateSettings } = useDesign();
  const [saving, setSaving] = useState(false);
  const [customHsl, setCustomHsl] = useState('');

  const handleColorChange = async (color: string) => {
    setSaving(true);
    try {
      await updateSettings({ primaryColor: color });
      toast.success('Cor primária atualizada!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleFontChange = async (font: string) => {
    setSaving(true);
    try {
      await updateSettings({ fontFamily: font });
      toast.success('Fonte atualizada!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (url: string, variant: 'light' | 'dark') => {
    setSaving(true);
    try {
      if (variant === 'light') {
        await updateSettings({ logoLightUrl: url });
      } else {
        await updateSettings({ logoDarkUrl: url });
      }
      toast.success(`Logo ${variant === 'light' ? 'claro' : 'escuro'} atualizado!`);
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleCustomHslApply = () => {
    if (!customHsl.trim()) return;
    // Validate HSL format (e.g. "172 55% 22%")
    const match = customHsl.trim().match(/^(\d{1,3})\s+(\d{1,3})%?\s+(\d{1,3})%?$/);
    if (!match) {
      toast.error('Formato inválido. Use: H S% L% (ex: 172 55% 22%)');
      return;
    }
    const normalized = `${match[1]} ${match[2]}% ${match[3]}%`;
    handleColorChange(normalized);
    setCustomHsl('');
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await updateSettings({
        primaryColor: '172 55% 22%',
        fontFamily: 'Google Sans',
        logoLightUrl: '',
        logoDarkUrl: '',
      });
      toast.success('Design restaurado ao padrão!');
    } catch {
      toast.error('Erro ao restaurar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Design</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize as cores, fontes e logo de toda a plataforma
          </p>
        </div>
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
      </div>

      {/* Preview Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Pré-visualização:</span>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary" />
              <Button size="sm">Botão Primário</Button>
              <Button size="sm" variant="outline">Botão Outline</Button>
              <span className="text-sm font-medium text-primary">Texto com cor primária</span>
            </div>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Accent Color */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="icon-box">
                <Palette />
              </div>
              <div>
                <CardTitle className="text-base">Cor Primária</CardTitle>
                <CardDescription>Define a cor de destaque de toda a plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color Grid */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Paleta de cores</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const isActive = settings.primaryColor === preset.value;
                  return (
                    <button
                      key={preset.value}
                      onClick={() => handleColorChange(preset.value)}
                      className="group relative flex flex-col items-center gap-1"
                      title={preset.label}
                    >
                      <div
                        className={`h-10 w-10 rounded-lg transition-all ${isActive ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: `hsl(${preset.value})` }}
                      >
                        {isActive && (
                          <div className="h-full w-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white drop-shadow-md" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[56px]">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom HSL Input */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Cor personalizada (HSL)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 210 80% 50%"
                  value={customHsl}
                  onChange={(e) => setCustomHsl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomHslApply()}
                />
                <Button variant="outline" onClick={handleCustomHslApply} size="default">
                  Aplicar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Atual: <code className="bg-muted px-1 py-0.5 rounded text-xs">{settings.primaryColor}</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Font Family */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="icon-box">
                <Type />
              </div>
              <div>
                <CardTitle className="text-base">Família de Fonte</CardTitle>
                <CardDescription>Escolha a tipografia da plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Fonte principal</Label>
              <Select value={settings.fontFamily} onValueChange={handleFontChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fonte" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Preview */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
              <Label className="text-xs text-muted-foreground">Pré-visualização da fonte</Label>
              <p className="text-2xl font-medium text-foreground">
                Aa Bb Cc Dd Ee
              </p>
              <p className="text-base text-foreground">
                O rato roeu a roupa do rei de Roma.
              </p>
              <p className="text-sm text-muted-foreground">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logo Light */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="icon-box">
                <ImageIcon />
              </div>
              <div>
                <CardTitle className="text-base">Logo (Modo Claro)</CardTitle>
                <CardDescription>Logo exibido no tema claro da plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={settings.logoLightUrl}
              onChange={(url) => handleLogoChange(url, 'light')}
              bucket="banners"
              folder="logos"
              aspectRatio="auto"
              maxWidth={400}
              maxHeight={120}
            />
            {!settings.logoLightUrl && (
              <p className="text-xs text-muted-foreground mt-2">
                Nenhum logo personalizado. Usando o padrão do sistema.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Logo Dark */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="icon-box">
                <ImageIcon />
              </div>
              <div>
                <CardTitle className="text-base">Logo (Modo Escuro)</CardTitle>
                <CardDescription>Logo exibido no tema escuro da plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={settings.logoDarkUrl}
              onChange={(url) => handleLogoChange(url, 'dark')}
              bucket="banners"
              folder="logos"
              aspectRatio="auto"
              maxWidth={400}
              maxHeight={120}
            />
            {!settings.logoDarkUrl && (
              <p className="text-xs text-muted-foreground mt-2">
                Nenhum logo personalizado. Usando o padrão do sistema.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
