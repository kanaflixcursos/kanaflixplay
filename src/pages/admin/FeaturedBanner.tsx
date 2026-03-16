import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Star, Eye, Plus, Trash2, Upload, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
}

interface BannerConfig {
  id: string;
  course_id: string | null;
  custom_title: string | null;
  custom_description: string | null;
  custom_image_url: string | null;
  gradient_from: string;
  gradient_to: string;
  is_active: boolean;
  cta_text: string;
  badge_text: string;
  order_index: number;
}

export default function AdminFeaturedBanner() {
  const [banners, setBanners] = useState<BannerConfig[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: bannerData }, { data: coursesData }] = await Promise.all([
      supabase.from('featured_banner').select('*').order('order_index'),
      supabase.from('courses').select('id, title, description, thumbnail_url').eq('is_published', true).order('title'),
    ]);

    const parsed = (bannerData || []) as unknown as BannerConfig[];
    setBanners(parsed);
    setCourses(coursesData || []);
    setLoading(false);
  };

  const config = banners[activeIndex] || null;

  const getSelectedCourse = (banner: BannerConfig) => {
    return banner.course_id ? courses.find((c) => c.id === banner.course_id) || null : null;
  };

  const selectedCourse = config ? getSelectedCourse(config) : null;

  const updateConfig = (updates: Partial<BannerConfig>) => {
    if (!config) return;
    const updated = banners.map((b, i) => (i === activeIndex ? { ...b, ...updates } : b));
    setBanners(updated);
  };

  const handleCourseChange = (courseId: string) => {
    if (!config) return;
    updateConfig({
      course_id: courseId === 'none' ? null : courseId,
      custom_title: null,
      custom_description: null,
      custom_image_url: null,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `banner-${config.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error('Erro ao fazer upload da imagem');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(fileName);
    updateConfig({ custom_image_url: urlData.publicUrl });
    setUploading(false);
    toast.success('Imagem enviada com sucesso!');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    const { error } = await supabase
      .from('featured_banner')
      .update({
        course_id: config.course_id,
        custom_title: config.custom_title,
        custom_description: config.custom_description,
        custom_image_url: config.custom_image_url,
        gradient_from: config.gradient_from,
        gradient_to: config.gradient_to,
        is_active: config.is_active,
        cta_text: config.cta_text,
        badge_text: config.badge_text,
        order_index: config.order_index,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    if (error) {
      toast.error('Erro ao salvar configurações');
    } else {
      toast.success('Banner atualizado com sucesso!');
    }
    setSaving(false);
  };

  const handleAddBanner = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('featured_banner')
      .insert({ order_index: banners.length })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar banner');
    } else if (data) {
      const newBanner = data as unknown as BannerConfig;
      setBanners([...banners, newBanner]);
      setActiveIndex(banners.length);
      toast.success('Novo banner criado!');
    }
    setSaving(false);
  };

  const handleDeleteBanner = async () => {
    if (!config || banners.length <= 1) return;
    setSaving(true);

    const { error } = await supabase.from('featured_banner').delete().eq('id', config.id);
    if (error) {
      toast.error('Erro ao excluir banner');
    } else {
      const updated = banners.filter((_, i) => i !== activeIndex);
      setBanners(updated);
      setActiveIndex(Math.max(0, activeIndex - 1));
      toast.success('Banner excluído!');
    }
    setSaving(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const updated = [...banners];
    const [a, b] = [updated[index], updated[index - 1]];
    const tempOrder = a.order_index;
    a.order_index = b.order_index;
    b.order_index = tempOrder;
    [updated[index], updated[index - 1]] = [b, a];
    setBanners(updated);
    setActiveIndex(index - 1);

    await Promise.all([
      supabase.from('featured_banner').update({ order_index: a.order_index }).eq('id', a.id),
      supabase.from('featured_banner').update({ order_index: b.order_index }).eq('id', b.id),
    ]);
    toast.success('Ordem atualizada!');
  };

  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return;
    const updated = [...banners];
    const [a, b] = [updated[index], updated[index + 1]];
    const tempOrder = a.order_index;
    a.order_index = b.order_index;
    b.order_index = tempOrder;
    [updated[index], updated[index + 1]] = [b, a];
    setBanners(updated);
    setActiveIndex(index + 1);

    await Promise.all([
      supabase.from('featured_banner').update({ order_index: a.order_index }).eq('id', a.id),
      supabase.from('featured_banner').update({ order_index: b.order_index }).eq('id', b.id),
    ]);
    toast.success('Ordem atualizada!');
  };

  // Preview helpers
  const activeBanners = banners.filter((b) => b.is_active);

  const getDisplayData = (banner: BannerConfig) => {
    const course = getSelectedCourse(banner);
    return {
      title: banner.custom_title || course?.title || 'Título do curso',
      description: banner.custom_description || course?.description || 'Descrição do curso em destaque',
      image: banner.custom_image_url || course?.thumbnail_url,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayData = config ? getDisplayData(config) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Banner em Destaque</h1>
        <p className="text-muted-foreground text-sm">Configure os banners exibidos na página de cursos dos alunos</p>
      </div>

      {/* Slideshow Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="icon-box">
              <Eye />
            </div>
            Pré-visualização do Slideshow
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="relative">
              {(() => {
                const pb = config;
                const pd = getDisplayData(pb);
                return (
                  <div
                    className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white min-h-[200px]"
                    style={{ background: `linear-gradient(135deg, ${pb.gradient_from}, ${pb.gradient_to})` }}
                  >
                    {pd.image && (
                      <div className="absolute top-0 right-0 w-1/2 h-full">
                        <img
                          src={pd.image}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{
                            maskImage: 'linear-gradient(to left, black 30%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to left, black 30%, transparent 100%)',
                          }}
                        />
                      </div>
                    )}

                    <div className="relative z-10 flex-1 max-w-[55%]">
                      <span className="inline-block px-3 py-1 rounded-md bg-white/20 text-xs font-semibold mb-3 backdrop-blur-sm">
                        {pb.badge_text}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">{pd.title}</h2>
                      <p className="text-sm text-white/80 mb-4 line-clamp-2">{pd.description}</p>
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-foreground font-medium text-sm">
                        {pb.cta_text}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveIndex((p) => (p - 1 + banners.length) % banners.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setActiveIndex((p) => (p + 1) % banners.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="flex justify-center gap-1.5 mt-3">
                    {banners.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIndex(i)}
                        className={`h-2 rounded-full transition-all ${i === activeIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum banner cadastrado</p>
          )}
        </CardContent>
      </Card>

      {/* Banner Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {banners.map((b, i) => (
          <div key={b.id} className="flex items-center gap-1">
            {i === activeIndex && banners.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleMoveUp(i)}
                disabled={i === 0}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant={i === activeIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveIndex(i)}
            >
              Banner {i + 1}
              {!b.is_active && <span className="ml-1 text-xs opacity-60">(inativo)</span>}
            </Button>
            {i === activeIndex && banners.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleMoveDown(i)}
                disabled={i === banners.length - 1}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={handleAddBanner} disabled={saving}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Config Form */}
      {config && displayData && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className="icon-box">
                  <Star />
                </div>
                Configuração — Banner {activeIndex + 1}
              </CardTitle>
              {banners.length > 1 && (
                <Button variant="destructive" size="sm" onClick={handleDeleteBanner} disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Banner ativo</Label>
                <p className="text-xs text-muted-foreground">Exibir este banner no slideshow</p>
              </div>
              <Switch
                checked={config.is_active}
                onCheckedChange={(checked) => updateConfig({ is_active: checked })}
              />
            </div>

            {/* Course Selection */}
            <div className="space-y-2">
              <Label>Curso em destaque</Label>
              <Select value={config.course_id || 'none'} onValueChange={handleCourseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum curso selecionado</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">O título, descrição e imagem serão extraídos do curso, mas podem ser personalizados abaixo.</p>
            </div>

            {/* Custom Overrides */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Título personalizado</Label>
                <Input
                  placeholder={selectedCourse?.title || 'Usar título do curso'}
                  value={config.custom_title || ''}
                  onChange={(e) => updateConfig({ custom_title: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Texto do badge</Label>
                <Input
                  value={config.badge_text}
                  onChange={(e) => updateConfig({ badge_text: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição personalizada</Label>
              <Textarea
                placeholder={selectedCourse?.description || 'Usar descrição do curso'}
                value={config.custom_description || ''}
                onChange={(e) => updateConfig({ custom_description: e.target.value || null })}
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem personalizada</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Fazer Upload
                </Button>
                {config.custom_image_url && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <img src={config.custom_image_url} alt="" className="h-10 w-16 object-cover rounded" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateConfig({ custom_image_url: null })}
                      className="text-destructive shrink-0"
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">A imagem cobrirá o lado direito do banner com um efeito de degradê</p>
            </div>

            <div className="space-y-2">
              <Label>Texto do botão (CTA)</Label>
              <Input
                value={config.cta_text}
                onChange={(e) => updateConfig({ cta_text: e.target.value })}
              />
            </div>

            {/* Gradient Colors */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor do gradiente (início)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.gradient_from}
                    onChange={(e) => updateConfig({ gradient_from: e.target.value })}
                    className="h-10 w-14 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={config.gradient_from}
                    onChange={(e) => updateConfig({ gradient_from: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor do gradiente (fim)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.gradient_to}
                    onChange={(e) => updateConfig({ gradient_to: e.target.value })}
                    className="h-10 w-14 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={config.gradient_to}
                    onChange={(e) => updateConfig({ gradient_to: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
