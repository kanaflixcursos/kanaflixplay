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
import { DatePicker } from '@/components/ui/date-picker';
import { ArrowLeft, Loader2, BookOpen, Package, DollarSign, Timer, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';

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
  const [priceStr, setPriceStr] = useState('');
  const [maxInstallments, setMaxInstallments] = useState(12);
  const [isActive, setIsActive] = useState(true);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (combo) {
      setTitle(combo.title);
      setDescription(combo.description || '');
      setThumbnailUrl(combo.thumbnail_url || '');
      // combo.price is in cents — CurrencyInput expects reais as decimal string
      setPriceStr(combo.price ? (combo.price / 100).toFixed(2) : '');
      setMaxInstallments(combo.max_installments);
      setIsActive(combo.is_active);
      setSelectedCourseIds(combo.courses.map(c => c.course_id));
      setMaxUses(combo.max_uses != null ? String(combo.max_uses) : '');
      setExpiresAt(combo.expires_at ? combo.expires_at.split('T')[0] : '');
    }
  }, [combo]);

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  // CurrencyInput onChange gives reais as "1234.56", multiply by 100 for cents
  const priceInCents = Math.round(parseFloat(priceStr || '0') * 100);

  const originalPrice = (courses || [])
    .filter(c => selectedCourseIds.includes(c.id))
    .reduce((sum, c) => sum + (c.price || 0), 0);

  const discount = originalPrice > 0 && priceInCents > 0 ? Math.round((1 - priceInCents / originalPrice) * 100) : 0;

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }
    if (selectedCourseIds.length < 2) {
      toast.error('Selecione pelo menos 2 cursos');
      return;
    }
    if (priceInCents <= 0) {
      toast.error('Defina um preço para o combo');
      return;
    }

    setSaving(true);
    try {
      await saveCombo(comboId || null, {
        title,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
        price: priceInCents,
        max_installments: maxInstallments,
        is_active: isActive,
        course_ids: selectedCourseIds,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        expires_at: expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : null,
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
            <h1 className="text-2xl font-medium tracking-tight font-heading">
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

      {/* Basic Info: Image left, Title+Description right */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informações Básicas</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="w-[140px] shrink-0">
              <Label className="mb-1.5 block">Capa</Label>
              <ImageUpload
                value={thumbnailUrl}
                onChange={setThumbnailUrl}
                bucket="course-covers"
                folder="combos"
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Pacote Completo" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o combo..." rows={3} />
              </div>
            </div>
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
                    <img src={course.thumbnail_url} alt="" className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
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

      {/* Pricing + Limits side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                {priceInCents > 0 && discount > 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Desconto do combo:</span>
                    <span className="font-semibold text-success">{discount}% off</span>
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Preço do Combo (R$) *</Label>
              <CurrencyInput value={priceStr} onChange={setPriceStr} />
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

        {/* Limits */}
        <Card>
          <CardHeader><CardTitle className="text-base">Limites de Uso</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Quantidade máxima de usos</Label>
              <Select value={maxUses || 'unlimited'} onValueChange={v => setMaxUses(v === 'unlimited' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Ilimitado</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Validade</Label>
              <DatePicker
                value={expiresAt}
                onChange={v => setExpiresAt(v)}
                placeholder="Sem validade"
                minDate={new Date()}
              />
              <p className="text-xs text-muted-foreground mt-1">Deixe vazio para não expirar</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
