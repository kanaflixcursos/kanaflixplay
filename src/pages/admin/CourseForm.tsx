import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, ArrowRight, Check, Loader2,
  Image as ImageIcon, Video, DollarSign, ClipboardCheck,
  Sparkles, CreditCard, QrCode, Barcode, Info, Plus, Star,
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CardBrandIcon } from '@/components/CardBrandIcon';
import CourseLessonsOrganizer, { CourseLessonsOrganizerRef } from '@/components/admin/CourseLessonsOrganizer';
import { useCategories } from '@/hooks/queries/useCourses';
import { type CourseFormData, initialCourseFormData, validateCourseStep } from '@/lib/validations/course';
import { calculateInstallments } from '@/utils/pricingCalculator';

interface PaymentMethodConfig {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
  card_brands?: { id: string; name: string; icon: string }[];
  installments?: {
    max: number;
    min_amount_per_installment: number;
    options: { number: number; interest_rate: number; label: string }[];
  };
  description?: string;
  discount_percentage?: number;
  expires_in_minutes?: number;
  expires_in_days?: number;
}

interface PaymentConfig {
  payment_methods: PaymentMethodConfig[];
  currency: { code: string; symbol: string; decimal_separator: string; thousands_separator: string };
  limits: { min_amount: number; max_amount: number };
}

const STEPS = [
  { id: 1, title: 'Informações Básicas', icon: ImageIcon },
  { id: 2, title: 'Aulas do Curso', icon: Video },
  { id: 3, title: 'Precificação', icon: DollarSign },
  { id: 4, title: 'Revisar e Criar', icon: ClipboardCheck },
];

export default function CourseForm() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const isEditing = Boolean(courseId);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CourseFormData>(initialCourseFormData);
  const [saving, setSaving] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(isEditing);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [loadingPaymentConfig, setLoadingPaymentConfig] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [localCategories, setLocalCategories] = useState<{ id: string; name: string }[]>([]);

  const lessonsOrganizerRef = useRef<CourseLessonsOrganizerRef>(null);

  // Use React Query for categories
  const { data: queriedCategories = [] } = useCategories();
  const categories = localCategories.length > 0 ? localCategories : queriedCategories;

  useEffect(() => {
    if (queriedCategories.length > 0 && localCategories.length === 0) {
      setLocalCategories(queriedCategories);
    }
  }, [queriedCategories]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { data, error } = await supabase
      .from('course_categories')
      .insert({ name: newCategoryName.trim() })
      .select('id, name')
      .single();
    if (error) { toast.error('Erro ao criar categoria'); return; }
    if (data) {
      setLocalCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, category_id: data.id }));
      setNewCategoryName('');
      setShowNewCategory(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchCourse();
    fetchPaymentConfig();
  }, [courseId]);

  const fetchPaymentConfig = async () => {
    setLoadingPaymentConfig(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const response = await fetch(
        'https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/pagarme',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'get_payment_config' }),
        }
      );

      if (response.ok) {
        const config = await response.json();
        setPaymentConfig(config);
        if (formData.payment_methods.length === 0) {
          const enabledMethods = config.payment_methods
            .filter((m: PaymentMethodConfig) => m.enabled)
            .map((m: PaymentMethodConfig) => m.id);
          setFormData(prev => ({ ...prev, payment_methods: enabledMethods }));
        }
      }
    } catch {
      // Payment config fetch is non-critical
    } finally {
      setLoadingPaymentConfig(false);
    }
  };

  const fetchCourse = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error || !data) {
      toast.error('Curso não encontrado');
      navigate('/admin/courses');
      return;
    }

    setFormData({
      title: data.title,
      description: data.description || '',
      thumbnail_url: data.thumbnail_url || '',
      pandavideo_folder_id: data.pandavideo_folder_id || '',
      pandavideo_folder_name: '',
      is_sequential: data.is_sequential ?? true,
      save_as_draft: !data.is_published,
      pricing_type: data.price && data.price > 0 ? 'paid' : 'free',
      price: data.price ? (data.price / 100).toFixed(2) : '',
      payment_methods: ['pix', 'credit_card', 'boleto'],
      installments: String(data.max_installments || 12),
      category_id: data.category_id || '',
      launch_date: data.launch_date ? data.launch_date.split('T')[0] : '',
      points_reward: String((data as any).points_reward || 0),
    });

    setLoadingCourse(false);
  };

  const updateField = <K extends keyof CourseFormData>(key: K, value: CourseFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const togglePaymentMethod = (methodId: string) => {
    const current = formData.payment_methods;
    updateField('payment_methods',
      current.includes(methodId)
        ? current.filter(m => m !== methodId)
        : [...current, methodId]
    );
  };

  const handleNext = () => {
    const error = validateCourseStep(currentStep, formData);
    if (error) { toast.error(error); return; }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSave = async () => {
    setSaving(true);
    try {
      const priceInCents = formData.pricing_type === 'paid' && formData.price 
        ? Math.round(parseFloat(formData.price) * 100) 
        : 0;

      const courseData: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        thumbnail_url: formData.thumbnail_url,
        pandavideo_folder_id: formData.pandavideo_folder_id || null,
        is_sequential: formData.is_sequential,
        is_published: !formData.save_as_draft,
        price: priceInCents,
        category_id: formData.category_id || null,
        max_installments: parseInt(formData.installments) || 12,
        launch_date: formData.launch_date ? new Date(formData.launch_date + 'T00:00:00').toISOString() : null,
        points_reward: parseInt(formData.points_reward || '0') || 0,
      };

      let savedCourseId = courseId;

      if (isEditing) {
        const { error } = await supabase
          .from('courses')
          .update(courseData as any)
          .eq('id', courseId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert(courseData as any)
          .select('id')
          .single();
        if (error) throw error;
        savedCourseId = data.id;
      }

      if (savedCourseId && lessonsOrganizerRef.current) {
        await lessonsOrganizerRef.current.save(savedCourseId);
      }

      toast.success(isEditing ? 'Curso atualizado!' : 'Curso criado com sucesso!');
      navigate('/admin/courses');
    } catch {
      toast.error('Erro ao salvar curso');
    } finally {
      setSaving(false);
    }
  };

  if (loadingCourse) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const organizerLessons = lessonsOrganizerRef.current?.getLessons() || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/courses')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Curso' : 'Novo Curso'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {STEPS[currentStep - 1].title}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted || isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`text-xs mt-2 text-center ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Capa do Curso</Label>
                <ImageUpload
                  value={formData.thumbnail_url}
                  onChange={(url) => updateField('thumbnail_url', url)}
                  bucket="course-covers"
                  aspectRatio="4/5"
                  maxWidth={1080}
                  maxHeight={1350}
                />
                <p className="text-xs text-muted-foreground">Tamanho recomendado: 1080x1350px</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Nome do Curso *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Digite o nome do curso"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => updateField('category_id', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCategory(!showNewCategory)} title="Criar nova categoria">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {showNewCategory && (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Nome da nova categoria..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                      />
                      <Button type="button" size="sm" onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
                        Criar
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição do Curso</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Descreva o conteúdo do curso..."
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="launch_date">Data de Lançamento (opcional)</Label>
                  <Input
                    id="launch_date"
                    type="date"
                    value={formData.launch_date}
                    onChange={(e) => updateField('launch_date', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Se definida, o curso ficará em pré-venda até esta data</p>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <Checkbox
                    id="is_sequential"
                    checked={formData.is_sequential}
                    onCheckedChange={(checked) => updateField('is_sequential', checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="is_sequential" className="cursor-pointer">Progressão sequencial obrigatória</Label>
                    <p className="text-xs text-muted-foreground">Alunos precisam assistir 90% de cada aula para desbloquear a próxima</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Lessons */}
          {currentStep === 2 && (
            <CourseLessonsOrganizer
              ref={lessonsOrganizerRef}
              courseId={isEditing ? courseId : undefined}
              pandavideoFolderId={formData.pandavideo_folder_id}
              onFolderChange={(folderId, folderName) => {
                updateField('pandavideo_folder_id', folderId);
                updateField('pandavideo_folder_name', folderName);
              }}
              showFolderSelector={true}
            />
          )}

          {/* Step 3: Pricing */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">Modelo de Monetização</Label>
                </div>
                <RadioGroup
                  value={formData.pricing_type}
                  onValueChange={(value: 'free' | 'paid') => updateField('pricing_type', value)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div
                    className={`relative flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.pricing_type === 'free' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => updateField('pricing_type', 'free')}
                  >
                    <RadioGroupItem value="free" id="free" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="free" className="font-semibold cursor-pointer text-base">Conteúdo Gratuito</Label>
                      <p className="text-sm text-muted-foreground">Acesso livre para todos os alunos cadastrados</p>
                    </div>
                    {formData.pricing_type === 'free' && <Sparkles className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                  </div>
                  <div
                    className={`relative flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.pricing_type === 'paid' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => updateField('pricing_type', 'paid')}
                  >
                    <RadioGroupItem value="paid" id="paid" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="paid" className="font-semibold cursor-pointer text-base">Conteúdo Pago</Label>
                      <p className="text-sm text-muted-foreground">Defina um valor e aceite pagamentos online</p>
                    </div>
                    {formData.pricing_type === 'paid' && <DollarSign className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                  </div>
                </RadioGroup>
              </div>

              {formData.pricing_type === 'paid' && (
                <div className="space-y-6 pt-6 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="price" className="text-sm font-medium">Valor Base do Curso</Label>
                      <CurrencyInput
                        id="price"
                        value={formData.price}
                        onChange={(value) => updateField('price', value)}
                        placeholder="0,00"
                        className="h-12 text-lg"
                      />
                      <p className="text-xs text-muted-foreground">Valor base de referência (não é o valor final cobrado do aluno)</p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="installments" className="text-sm font-medium">Parcelamento Máximo</Label>
                      <Select
                        value={formData.installments}
                        onValueChange={(value) => updateField('installments', value)}
                        disabled={!formData.payment_methods.includes('credit_card')}
                      >
                        <SelectTrigger className={`h-12 ${!formData.payment_methods.includes('credit_card') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const basePrice = parseFloat(formData.price) || 0;
                            const installmentOptions = calculateInstallments(basePrice);
                            return installmentOptions.map((opt) => {
                              const priceLabel = basePrice > 0
                                ? opt.installments === 1
                                  ? ` — R$ ${basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} à vista`
                                  : ` — ${opt.installments}x de R$ ${opt.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (total R$ ${opt.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
                                : '';
                              return (
                                <SelectItem key={opt.installments} value={opt.installments.toString()}>
                                  {opt.installments === 1 ? 'À vista' : `Até ${opt.installments}x`}{priceLabel}
                                </SelectItem>
                              );
                            });
                          })()}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.payment_methods.includes('credit_card')
                          ? 'Quantidade de parcelas no cartão de crédito'
                          : 'Selecione Cartão de Crédito para habilitar parcelamento'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Métodos de Pagamento Aceitos</Label>
                    {loadingPaymentConfig ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                      </div>
                    ) : paymentConfig ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {paymentConfig.payment_methods.map((method) => {
                          const isSelected = formData.payment_methods.includes(method.id);
                          const IconComponent = method.id === 'credit_card' ? CreditCard : method.id === 'pix' ? QrCode : Barcode;
                          return (
                            <div
                              key={method.id}
                              onClick={() => togglePaymentMethod(method.id)}
                              className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <IconComponent className="h-5 w-5 text-primary" />
                                  <span className="text-sm font-semibold">{method.name}</span>
                                </div>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => togglePaymentMethod(method.id)}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                              </div>
                              {method.description && <p className="text-xs text-muted-foreground">{method.description}</p>}
                              {method.discount_percentage != null && method.discount_percentage > 0 && (
                                <Badge variant="secondary" className="w-fit text-xs">{method.discount_percentage}% de desconto</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Como funciona a precificação</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div className="space-y-1.5">
                        <p className="font-medium text-foreground text-xs">Cartão de Crédito</p>
                        <p>• À vista (1x): preço de vitrine (taxa absorvida)</p>
                        <p>• 2x a 12x: juros do gateway repassados ao cliente</p>
                        <p>• C.E.T. varia de 4,30% (2x) a 14,09% (12x)</p>
                        <p>• O valor líquido recebido é sempre o preço base</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-medium text-foreground text-xs">PIX</p>
                        <p>• 3% de desconto sobre o preço base</p>
                        <p className="pt-1 font-medium text-foreground text-xs">Boleto</p>
                        <p>• Mesmo valor do preço base (à vista)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Points Reward */}
              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">Pontos de Recompensa</Label>
                </div>
                <div className="max-w-xs space-y-2">
                  <Input
                    type="number"
                    min="0"
                    value={formData.points_reward}
                    onChange={(e) => updateField('points_reward', e.target.value)}
                    placeholder="0"
                    className="h-12 text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantidade de pontos que o aluno ganha ao se matricular neste curso
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Revisar Configurações</CardTitle>
                <CardDescription>
                  Verifique as informações antes de {isEditing ? 'salvar' : 'criar'} o curso
                </CardDescription>
              </CardHeader>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    formData.title ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  }`}>
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Informações Básicas</p>
                    <p className="text-sm text-muted-foreground">{formData.title || 'Sem título'}</p>
                    {formData.thumbnail_url && <p className="text-xs text-success mt-1">✓ Capa adicionada</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    organizerLessons.length > 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-foreground'
                  }`}>
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Aulas do Curso</p>
                    <p className="text-sm text-muted-foreground">
                      {organizerLessons.length > 0 ? `${organizerLessons.length} aulas configuradas` : 'Nenhuma aula selecionada (opcional)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-success/10 text-success">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Precificação</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.pricing_type === 'free'
                        ? 'Conteúdo Gratuito'
                        : `R$ ${parseFloat(formData.price || '0').toFixed(2)} - até ${formData.installments}x`}
                    </p>
                    {formData.pricing_type === 'paid' && formData.payment_methods.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pagamento: {formData.payment_methods.map(m =>
                          paymentConfig?.payment_methods.find(pm => pm.id === m)?.name || m
                        ).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="save_as_draft"
                    checked={formData.save_as_draft}
                    onCheckedChange={(checked) => updateField('save_as_draft', checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="save_as_draft" className="cursor-pointer font-medium">Salvar como rascunho</Label>
                    <p className="text-sm text-muted-foreground">O curso não ficará visível para os alunos até ser publicado</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={currentStep === 1 ? () => navigate('/admin/courses') : handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 1 ? 'Cancelar' : 'Voltar'}
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {isEditing ? 'Salvar Alterações' : 'Criar Curso'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
