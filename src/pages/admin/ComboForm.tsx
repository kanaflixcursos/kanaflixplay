import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdminCourses } from '@/hooks/queries/useCourses';
import { useCombo, useInvalidateCombos } from '@/hooks/queries/useCombos';
import { saveCombo } from '@/services/comboService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ArrowLeft, Loader2, BookOpen, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';

export default function ComboForm() {
  const navigate = useNavigate();
  const { comboId } = useParams<{ comboId: string }>();
  const isEdit = !!comboId;

  const { data: courses, isLoading: coursesLoading } = useAdminCourses();
  const { data: combo, isLoading: comboLoading } = useCombo(comboId);
  const invalidate = useInvalidateCombos();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [price, setPrice] = useState(0);
  const [maxInstallments, setMaxInstallments] = useState(12);
  const [isActive, setIsActive] = useState(true);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (combo) {
      setTitle(combo.title);
      setDescription(combo.description || '');
      setThumbnailUrl(combo.thumbnail_url || '');
      setPrice(combo.price);
      setMaxInstallments(combo.max_installments);
      setIsActive(combo.is_active);
      setSelectedCourseIds(combo.courses.map(c => c.course_id));
    }
  }, [combo]);

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const originalPrice = (courses || [])
    .filter(c => selectedCourseIds.includes(c.id))
    .reduce((sum, c) => sum + (c.price || 0), 0);

  const discount = originalPrice > 0 && price > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }
    if (selectedCourseIds.length < 2) {
      toast.error('Selecione pelo menos 2 cursos');
      return;
    }
    if (price <= 0) {
      toast.error('Defina um preço para o combo');
      return;
    }

    setSaving(true);
    try {
      await saveCombo(comboId || null, {
        title,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
        price,
        max_installments: maxInstallments,
        is_active: isActive,
        course_ids: selectedCourseIds,
      });
      invalidate();
      toast.success(isEdit ? 'Combo atualizado!' : 'Combo criado!');
      navigate('/admin/marketing/combos');
    } catch {
      toast.error('Erro ao salvar combo');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  if (isEdit && comboLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing/combos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEdit ? 'Editar Combo' : 'Novo Combo'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="active-switch" className="text-sm">Ativo</Label>
            <Switch id="active-switch" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informações Básicas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Pacote Completo" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o combo..." rows={3} />
          </div>
          <div>
            <Label>Imagem do Combo</Label>
            <ImageUpload
              currentImage={thumbnailUrl}
              onImageChange={setThumbnailUrl}
              bucket="course-covers"
              folder="combos"
              aspectRatio="landscape"
            />
          </div>
        </CardContent>
      </Card>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cursos do Combo ({selectedCourseIds.length} selecionados)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coursesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {(courses || []).map(course => (
                <label
                  key={course.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedCourseIds.includes(course.id)}
                    onCheckedChange={() => toggleCourse(course.id)}
                  />
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm font-medium flex-1 truncate">{course.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {course.price ? formatPrice(course.price) : 'Grátis'}
                  </span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader><CardTitle className="text-base">Precificação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {originalPrice > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Soma dos cursos:</span>
                <span className="font-medium line-through text-muted-foreground">{formatPrice(originalPrice)}</span>
              </div>
              {price > 0 && discount > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Desconto do combo:</span>
                  <span className="font-semibold text-success">{discount}% off</span>
                </div>
              )}
            </div>
          )}
          <div>
            <Label>Preço do Combo (R$) *</Label>
            <CurrencyInput value={price} onChange={setPrice} />
          </div>
          <div>
            <Label>Parcelas Máximas</Label>
            <Select value={String(maxInstallments)} onValueChange={v => setMaxInstallments(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/admin/marketing/combos')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Criar Combo'}
        </Button>
      </div>
    </div>
  );
}
