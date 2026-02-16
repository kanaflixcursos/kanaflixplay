import { useState, useEffect } from 'react';
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
import { Loader2, Star, Eye } from 'lucide-react';

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
}

export default function AdminFeaturedBanner() {
  const [config, setConfig] = useState<BannerConfig | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: bannerData }, { data: coursesData }] = await Promise.all([
      supabase.from('featured_banner').select('*').limit(1).single(),
      supabase.from('courses').select('id, title, description, thumbnail_url').eq('is_published', true).order('title'),
    ]);

    if (bannerData) {
      setConfig(bannerData as unknown as BannerConfig);
      if (bannerData.course_id && coursesData) {
        const course = coursesData.find((c) => c.id === bannerData.course_id);
        setSelectedCourse(course || null);
      }
    }
    setCourses(coursesData || []);
    setLoading(false);
  };

  const handleCourseChange = (courseId: string) => {
    if (!config) return;
    const course = courses.find((c) => c.id === courseId) || null;
    setSelectedCourse(course);
    setConfig({
      ...config,
      course_id: courseId === 'none' ? null : courseId,
      custom_title: null,
      custom_description: null,
      custom_image_url: null,
    });
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

  const displayTitle = config?.custom_title || selectedCourse?.title || 'Título do curso';
  const displayDescription = config?.custom_description || selectedCourse?.description || 'Descrição do curso em destaque';
  const displayImage = config?.custom_image_url || selectedCourse?.thumbnail_url;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Banner em Destaque</h1>
        <p className="text-muted-foreground text-sm">Configure o banner exibido na página de cursos dos alunos</p>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="p-2 rounded-xl bg-chart-5/10">
              <Eye className="h-5 w-5 text-chart-5" />
            </div>
            Pré-visualização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white"
            style={{
              background: `linear-gradient(135deg, ${config.gradient_from}, ${config.gradient_to})`,
            }}
          >
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20" />
              <div className="absolute bottom-4 right-20 w-20 h-20 rounded-full bg-white/15" />
            </div>

            <div className="relative z-10 flex items-center gap-6">
              <div className="flex-1 max-w-lg">
                <span className="inline-block px-3 py-1 rounded-md bg-white/20 text-xs font-semibold mb-3 backdrop-blur-sm">
                  {config.badge_text}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">{displayTitle}</h2>
                <p className="text-sm text-white/80 mb-4 line-clamp-2">{displayDescription}</p>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-900 font-medium text-sm">
                  {config.cta_text}
                </span>
              </div>
              {displayImage && (
                <div className="hidden md:block w-32 h-40 rounded-xl overflow-hidden shrink-0 shadow-lg">
                  <img src={displayImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="p-2 rounded-xl bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Banner ativo</Label>
              <p className="text-xs text-muted-foreground">Exibir o banner na página de cursos dos alunos</p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
            />
          </div>

          {/* Course Selection */}
          <div className="space-y-2">
            <Label>Curso em destaque</Label>
            <Select
              value={config.course_id || 'none'}
              onValueChange={handleCourseChange}
            >
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Título personalizado</Label>
              <Input
                placeholder={selectedCourse?.title || 'Usar título do curso'}
                value={config.custom_title || ''}
                onChange={(e) => setConfig({ ...config, custom_title: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do badge</Label>
              <Input
                value={config.badge_text}
                onChange={(e) => setConfig({ ...config, badge_text: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição personalizada</Label>
            <Textarea
              placeholder={selectedCourse?.description || 'Usar descrição do curso'}
              value={config.custom_description || ''}
              onChange={(e) => setConfig({ ...config, custom_description: e.target.value || null })}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>URL da imagem personalizada</Label>
              <Input
                placeholder="Usar capa do curso"
                value={config.custom_image_url || ''}
                onChange={(e) => setConfig({ ...config, custom_image_url: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do botão (CTA)</Label>
              <Input
                value={config.cta_text}
                onChange={(e) => setConfig({ ...config, cta_text: e.target.value })}
              />
            </div>
          </div>

          {/* Gradient Colors */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cor do gradiente (início)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.gradient_from}
                  onChange={(e) => setConfig({ ...config, gradient_from: e.target.value })}
                  className="h-10 w-14 rounded-lg border cursor-pointer"
                />
                <Input
                  value={config.gradient_from}
                  onChange={(e) => setConfig({ ...config, gradient_from: e.target.value })}
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
                  onChange={(e) => setConfig({ ...config, gradient_to: e.target.value })}
                  className="h-10 w-14 rounded-lg border cursor-pointer"
                />
                <Input
                  value={config.gradient_to}
                  onChange={(e) => setConfig({ ...config, gradient_to: e.target.value })}
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
    </div>
  );
}
