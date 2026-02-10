import { useEffect, useState } from 'react';
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
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2, 
  Folder, 
  GripVertical,
  Image as ImageIcon,
  Video,
  DollarSign,
  ClipboardCheck,
  Sparkles,
  CreditCard,
  QrCode,
  Barcode,
  Info,
  Plus,
  Trash2,
  Layers
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import PandavideoFolderSelector from '@/components/PandavideoFolderSelector';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CardBrandIcon } from '@/components/CardBrandIcon';

interface VideoItem {
  id: string;
  title: string;
  original_title: string;
  duration: number;
  status: string;
  module_id?: string | null;
}

interface LocalModule {
  id: string;
  title: string;
  order_index: number;
}

interface CardBrand {
  id: string;
  name: string;
  icon: string;
}

interface InstallmentOption {
  number: number;
  interest_rate: number;
  label: string;
}

interface PaymentMethodConfig {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
  card_brands?: CardBrand[];
  installments?: {
    max: number;
    min_amount_per_installment: number;
    options: InstallmentOption[];
  };
  description?: string;
  discount_percentage?: number;
  expires_in_minutes?: number;
  expires_in_days?: number;
}

interface PaymentConfig {
  payment_methods: PaymentMethodConfig[];
  currency: {
    code: string;
    symbol: string;
    decimal_separator: string;
    thousands_separator: string;
  };
  limits: {
    min_amount: number;
    max_amount: number;
  };
}

interface FormData {
  title: string;
  description: string;
  thumbnail_url: string;
  pandavideo_folder_id: string;
  pandavideo_folder_name: string;
  is_sequential: boolean;
  save_as_draft: boolean;
  pricing_type: 'free' | 'paid';
  price: string;
  payment_methods: string[];
  installments: string;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  thumbnail_url: '',
  pandavideo_folder_id: '',
  pandavideo_folder_name: '',
  is_sequential: true,
  save_as_draft: false,
  pricing_type: 'free',
  price: '',
  payment_methods: [],
  installments: '1',
};

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
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(isEditing);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [loadingPaymentConfig, setLoadingPaymentConfig] = useState(false);
  const [localModules, setLocalModules] = useState<LocalModule[]>([]);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
    fetchPaymentConfig();
  }, [courseId]);

  useEffect(() => {
    if (formData.pandavideo_folder_id) {
      fetchVideosFromFolder();
    }
  }, [formData.pandavideo_folder_id]);

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
        
        // Set default payment methods if not already set
        if (formData.payment_methods.length === 0) {
          const enabledMethods = config.payment_methods
            .filter((m: PaymentMethodConfig) => m.enabled)
            .map((m: PaymentMethodConfig) => m.id);
          setFormData(prev => ({ ...prev, payment_methods: enabledMethods }));
        }
      }
    } catch (error) {
      console.error('Error fetching payment config:', error);
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
      installments: '12',
    });

    // Fetch existing modules when editing
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (modulesData && modulesData.length > 0) {
      setLocalModules(modulesData.map(m => ({ id: m.id, title: m.title, order_index: m.order_index })));
    }

    setLoadingCourse(false);
  };

  const fetchVideosFromFolder = async () => {
    setLoadingVideos(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Você precisa estar autenticado');
        return;
      }

      // Fetch videos from Pandavideo API
      const response = await fetch(
        `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/pandavideo?action=list&folder_id=${formData.pandavideo_folder_id}`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar vídeos');
      }

      // Build video list from Pandavideo
      const pandaVideos: VideoItem[] = (data.videos || []).map((v: any) => {
        let durationSeconds = 0;
        if (v.length && typeof v.length === 'number') {
          durationSeconds = v.length;
        } else if (v.video_player?.duration) {
          durationSeconds = v.video_player.duration;
        } else if (v.duration && typeof v.duration === 'number') {
          durationSeconds = v.duration;
        }
        
        return {
          id: v.id,
          title: v.title,
          original_title: v.title,
          duration: durationSeconds,
          status: v.status,
        };
      });

      // If editing, fetch saved lessons to preserve order and custom titles
      if (isEditing && courseId) {
        const { data: savedLessons } = await supabase
          .from('lessons')
          .select('pandavideo_video_id, title, order_index, duration_minutes, module_id')
          .eq('course_id', courseId)
          .order('order_index', { ascending: true });

        if (savedLessons && savedLessons.length > 0) {
          // Create a map of saved lessons by pandavideo_video_id
          const savedLessonsMap = new Map(
            savedLessons.map(lesson => [lesson.pandavideo_video_id, lesson])
          );

          // Separate videos that exist in saved lessons from new ones
          const existingVideos: VideoItem[] = [];
          const newVideos: VideoItem[] = [];

          pandaVideos.forEach(video => {
            const savedLesson = savedLessonsMap.get(video.id);
            if (savedLesson) {
              existingVideos.push({
                ...video,
                title: savedLesson.title || video.title,
                duration: savedLesson.duration_minutes ? savedLesson.duration_minutes * 60 : video.duration,
                module_id: savedLesson.module_id,
              });
            } else {
              newVideos.push(video);
            }
          });

          // Sort existing videos by their saved order_index
          existingVideos.sort((a, b) => {
            const orderA = savedLessonsMap.get(a.id)?.order_index ?? 999;
            const orderB = savedLessonsMap.get(b.id)?.order_index ?? 999;
            return orderA - orderB;
          });

          // Append new videos at the end
          setVideos([...existingVideos, ...newVideos]);
        } else {
          setVideos(pandaVideos);
        }
      } else {
        setVideos(pandaVideos);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Erro ao carregar vídeos da pasta');
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleFolderSelect = (folder: { id: string; name: string }) => {
    setFormData({
      ...formData,
      pandavideo_folder_id: folder.id,
      pandavideo_folder_name: folder.name,
    });
    setVideos([]);
  };

  const handleVideoTitleChange = (index: number, newTitle: string) => {
    const updated = [...videos];
    updated[index].title = newTitle;
    setVideos(updated);
  };

  const handleVideoModuleChange = (index: number, moduleId: string | null) => {
    const updated = [...videos];
    updated[index].module_id = moduleId;
    setVideos(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newVideos = [...videos];
    const draggedItem = newVideos[draggedIndex];
    newVideos.splice(draggedIndex, 1);
    newVideos.splice(index, 0, draggedItem);
    setVideos(newVideos);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddLocalModule = () => {
    if (!newModuleTitle.trim()) return;
    const nextIndex = localModules.length > 0
      ? Math.max(...localModules.map(m => m.order_index)) + 1
      : 1;
    setLocalModules([...localModules, {
      id: `local-${Date.now()}`,
      title: newModuleTitle.trim(),
      order_index: nextIndex,
    }]);
    setNewModuleTitle('');
  };

  const handleDeleteLocalModule = (moduleId: string) => {
    setLocalModules(localModules.filter(m => m.id !== moduleId));
    setVideos(videos.map(v => v.module_id === moduleId ? { ...v, module_id: null } : v));
  };

  const handleUpdateLocalModuleTitle = (moduleId: string, title: string) => {
    setLocalModules(localModules.map(m => m.id === moduleId ? { ...m, title } : m));
  };

  const togglePaymentMethod = (methodId: string) => {
    const current = formData.payment_methods;
    if (current.includes(methodId)) {
      setFormData({ ...formData, payment_methods: current.filter(m => m !== methodId) });
    } else {
      setFormData({ ...formData, payment_methods: [...current, methodId] });
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          toast.error('O nome do curso é obrigatório');
          return false;
        }
        return true;
      case 2:
        return true;
      case 3:
        if (formData.pricing_type === 'paid') {
          if (!formData.price || parseFloat(formData.price) <= 0) {
            toast.error('Informe um valor válido para o curso');
            return false;
          }
          if (formData.payment_methods.length === 0) {
            toast.error('Selecione pelo menos um método de pagamento');
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const priceInCents = formData.pricing_type === 'paid' && formData.price 
        ? Math.round(parseFloat(formData.price) * 100) 
        : 0;

      const courseData = {
        title: formData.title,
        description: formData.description,
        thumbnail_url: formData.thumbnail_url,
        pandavideo_folder_id: formData.pandavideo_folder_id || null,
        is_sequential: formData.is_sequential,
        is_published: !formData.save_as_draft,
        price: priceInCents,
      };

      let savedCourseId = courseId;

      if (isEditing) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', courseId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert(courseData)
          .select('id')
          .single();

        if (error) throw error;
        savedCourseId = data.id;
      }

      // Save modules first (to get real IDs for local modules)
      const moduleIdMap = new Map<string, string>(); // local-id -> real-id
      if (localModules.length > 0 && savedCourseId) {
        for (const mod of localModules) {
          const isExistingModule = !mod.id.startsWith('local-');
          if (isExistingModule) {
            await supabase
              .from('course_modules')
              .update({ title: mod.title, order_index: mod.order_index })
              .eq('id', mod.id);
            moduleIdMap.set(mod.id, mod.id);
          } else {
            const { data: newMod } = await supabase
              .from('course_modules')
              .insert({
                course_id: savedCourseId,
                title: mod.title,
                order_index: mod.order_index,
              })
              .select('id')
              .single();
            if (newMod) {
              moduleIdMap.set(mod.id, newMod.id);
            }
          }
        }
      }

      // Save lesson order, custom titles, and module assignments
      if (videos.length > 0 && savedCourseId) {
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          const resolvedModuleId = video.module_id
            ? (moduleIdMap.get(video.module_id) || video.module_id)
            : null;
          await supabase
            .from('lessons')
            .upsert({
              course_id: savedCourseId,
              pandavideo_video_id: video.id,
              title: video.title,
              order_index: i,
              duration_minutes: Math.ceil(video.duration / 60),
              module_id: resolvedModuleId,
            }, {
              onConflict: 'pandavideo_video_id',
            });
        }
      }

      // Auto-sync lessons from Pandavideo after creating/updating course
      if (savedCourseId && formData.pandavideo_folder_id) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            await supabase.functions.invoke('sync-pandavideo-lessons', {
              body: { courseId: savedCourseId },
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            });
          }
        } catch (syncError) {
          console.error('Auto-sync error:', syncError);
          // Don't fail the save operation if sync fails
        }
      }

      toast.success(isEditing ? 'Curso atualizado!' : 'Curso criado com sucesso!');
      navigate('/admin/courses');
    } catch (error) {
      console.error('Error saving course:', error);
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
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
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
                  onChange={(url) => setFormData({ ...formData, thumbnail_url: url })}
                  bucket="course-covers"
                  aspectRatio="4/5"
                  maxWidth={1080}
                  maxHeight={1350}
                />
                <p className="text-xs text-muted-foreground">
                  Tamanho recomendado: 1080x1350px
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Nome do Curso *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Digite o nome do curso"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição do Curso</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o conteúdo do curso..."
                    rows={6}
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <Checkbox
                    id="is_sequential"
                    checked={formData.is_sequential}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, is_sequential: checked === true })
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="is_sequential" className="cursor-pointer">
                      Progressão sequencial obrigatória
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Alunos precisam assistir 90% de cada aula para desbloquear a próxima
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Video Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Pasta de Vídeos (Pandavideo)</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 rounded-lg border bg-muted/50 min-h-[42px] flex items-center">
                    {formData.pandavideo_folder_id ? (
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {formData.pandavideo_folder_name || 'Pasta selecionada'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Nenhuma pasta selecionada
                      </span>
                    )}
                  </div>
                  <PandavideoFolderSelector
                    onSelect={handleFolderSelect}
                    selectedFolderId={formData.pandavideo_folder_id}
                  />
                </div>
              </div>

              {loadingVideos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : videos.length > 0 ? (
                <div className="space-y-4">
                  {/* Modules Section */}
                  <div className="space-y-3 border-b pb-6">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <Label className="text-base font-semibold">Módulos (opcional)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Crie módulos para organizar as aulas em seções. Após criar, atribua cada aula ao módulo desejado.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome do novo módulo..."
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLocalModule();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddLocalModule} disabled={!newModuleTitle.trim()} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                    {localModules.length > 0 && (
                      <div className="space-y-2">
                        {localModules.map((mod) => (
                          <div key={mod.id} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                            <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input
                              defaultValue={mod.title}
                              className="flex-1"
                              onBlur={(e) => {
                                if (e.target.value !== mod.title) {
                                  handleUpdateLocalModuleTitle(mod.id, e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLocalModule(mod.id)}
                              className="shrink-0 text-destructive hover:text-destructive"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lessons list */}
                  <Label>Aulas disponíveis ({videos.length})</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Arraste para reordenar{localModules.length > 0 ? ', atribua módulos' : ''} e edite os títulos se necessário
                  </p>
                  <div className="space-y-2">
                    {videos.map((video, index) => (
                      <div
                        key={video.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors ${
                          draggedIndex === index ? 'opacity-50 border-primary' : ''
                        }`}
                      >
                        <div className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Input
                          value={video.title}
                          onChange={(e) => handleVideoTitleChange(index, e.target.value)}
                          className="flex-1"
                        />
                        {localModules.length > 0 && (
                          <Select
                            value={video.module_id || '__none__'}
                            onValueChange={(value) =>
                              handleVideoModuleChange(index, value === '__none__' ? null : value)
                            }
                          >
                            <SelectTrigger className="w-40 shrink-0">
                              <SelectValue placeholder="Sem módulo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sem módulo</SelectItem>
                              {localModules.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDuration(video.duration)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          video.status === 'CONVERTED' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-warning/10 text-warning-foreground'
                        }`}>
                          {video.status === 'CONVERTED' ? 'Pronto' : 'Processando'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : formData.pandavideo_folder_id ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum vídeo encontrado nesta pasta</p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma pasta para ver os vídeos disponíveis</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Pricing */}
          {currentStep === 3 && (
            <div className="space-y-8">
              {/* Pricing Type Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">Modelo de Monetização</Label>
                </div>
                <RadioGroup
                  value={formData.pricing_type}
                  onValueChange={(value: 'free' | 'paid') => 
                    setFormData({ ...formData, pricing_type: value })
                  }
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div 
                    className={`relative flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.pricing_type === 'free' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({ ...formData, pricing_type: 'free' })}
                  >
                    <RadioGroupItem value="free" id="free" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="free" className="font-semibold cursor-pointer text-base">
                        Conteúdo Gratuito
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Acesso livre para todos os alunos cadastrados
                      </p>
                    </div>
                    {formData.pricing_type === 'free' && (
                      <Sparkles className="absolute top-4 right-4 h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div 
                    className={`relative flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.pricing_type === 'paid' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({ ...formData, pricing_type: 'paid' })}
                  >
                    <RadioGroupItem value="paid" id="paid" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="paid" className="font-semibold cursor-pointer text-base">
                        Conteúdo Pago
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Defina um valor e aceite pagamentos online
                      </p>
                    </div>
                    {formData.pricing_type === 'paid' && (
                      <DollarSign className="absolute top-4 right-4 h-5 w-5 text-primary" />
                    )}
                  </div>
                </RadioGroup>
              </div>

              {formData.pricing_type === 'paid' && (
                <div className="space-y-6 pt-6 border-t">
                  {/* Price and Installments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="price" className="text-sm font-medium">
                        Valor do Curso
                      </Label>
                      <CurrencyInput
                        id="price"
                        value={formData.price}
                        onChange={(value) => setFormData({ ...formData, price: value })}
                        placeholder="0,00"
                        className="h-12 text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor à vista que o aluno pagará
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="installments" className="text-sm font-medium">
                        Parcelamento Máximo
                      </Label>
                      <Select
                        value={formData.installments}
                        onValueChange={(value) => setFormData({ ...formData, installments: value })}
                        disabled={!formData.payment_methods.includes('credit_card')}
                      >
                        <SelectTrigger className={`h-12 ${!formData.payment_methods.includes('credit_card') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentConfig?.payment_methods
                            .find(m => m.id === 'credit_card')
                            ?.installments?.options.map((option) => (
                              <SelectItem key={option.number} value={option.number.toString()}>
                                {option.label}
                              </SelectItem>
                            )) || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n === 1 ? 'À vista apenas' : `Até ${n}x`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.payment_methods.includes('credit_card') 
                          ? 'Quantidade de parcelas no cartão de crédito'
                          : 'Selecione Cartão de Crédito para habilitar parcelamento'}
                      </p>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Métodos de Pagamento Aceitos</Label>
                    {loadingPaymentConfig ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                      </div>
                    ) : paymentConfig ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {paymentConfig.payment_methods.map((method) => {
                          const isSelected = formData.payment_methods.includes(method.id);
                          const IconComponent = method.id === 'credit_card' ? CreditCard : 
                                                method.id === 'pix' ? QrCode : Barcode;
                          return (
                            <div
                              key={method.id}
                              onClick={() => togglePaymentMethod(method.id)}
                              className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
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
                              {method.description && (
                                <p className="text-xs text-muted-foreground">{method.description}</p>
                              )}
                              {method.discount_percentage && method.discount_percentage > 0 && (
                                <Badge variant="secondary" className="w-fit text-xs">
                                  {method.discount_percentage}% de desconto
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {/* Card Brands */}
                  {formData.payment_methods.includes('credit_card') && paymentConfig && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Bandeiras Aceitas</Label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {paymentConfig.payment_methods
                          .find(m => m.id === 'credit_card')
                          ?.card_brands?.map((brand) => (
                            <div 
                              key={brand.id} 
                              className="p-1.5 rounded-md border bg-card"
                              title={brand.name}
                            >
                              <CardBrandIcon brand={brand.id} className="h-5 w-auto" />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Installment Interest Info */}
                  {formData.payment_methods.includes('credit_card') && paymentConfig && parseInt(formData.installments) > 6 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <Info className="h-4 w-4 text-warning-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-warning-foreground">
                        <p className="font-medium">Parcelas com juros</p>
                        <p className="text-xs opacity-80">
                          Parcelas acima de 6x podem ter juros de até 1.99% ao mês, dependendo da bandeira do cartão.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Price Preview */}
                  {formData.price && parseFloat(formData.price) > 0 && (
                    (() => {
                      const basePrice = parseFloat(formData.price);
                      const installmentCount = parseInt(formData.installments);
                      const installmentOption = paymentConfig?.payment_methods
                        .find(m => m.id === 'credit_card')
                        ?.installments?.options
                        .find(o => o.number === installmentCount);
                      
                      const interestRate = installmentOption?.interest_rate || 0;
                      const hasInterest = interestRate > 0;
                      
                      // Calculate total with compound interest if applicable
                      const totalWithInterest = hasInterest 
                        ? basePrice * Math.pow(1 + interestRate / 100, installmentCount)
                        : basePrice;
                      const installmentValue = totalWithInterest / installmentCount;
                      
                      // PIX discount
                      const pixMethod = paymentConfig?.payment_methods.find(m => m.id === 'pix');
                      const pixDiscount = pixMethod?.discount_percentage || 0;
                      const pixPrice = basePrice * (1 - pixDiscount / 100);

                      return (
                        <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                          <p className="text-sm font-medium text-foreground mb-4">Prévia do valor para o aluno</p>
                          
                          {/* Main price */}
                          <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-3xl font-bold text-foreground">
                              R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-sm text-muted-foreground">à vista</span>
                          </div>

                          {/* Installment options */}
                          {installmentCount > 1 && (
                            <div className="space-y-2 pt-3 border-t border-primary/10">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  {installmentCount}x no cartão
                                </span>
                                <div className="text-right">
                                  <span className="text-lg font-semibold text-foreground">
                                    R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  {hasInterest && (
                                    <span className="text-xs text-warning-foreground ml-2">
                                      ({interestRate}% a.m.)
                                    </span>
                                  )}
                                </div>
                              </div>
                              {hasInterest && (
                                <p className="text-xs text-muted-foreground">
                                  Total parcelado: R$ {totalWithInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          )}

                          {/* PIX discount */}
                          {formData.payment_methods.includes('pix') && pixDiscount > 0 && (
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-primary/10">
                              <div className="flex items-center gap-2">
                                <QrCode className="h-4 w-4 text-primary" />
                                <span className="text-sm text-muted-foreground">PIX ({pixDiscount}% off)</span>
                              </div>
                              <span className="text-lg font-semibold text-success">
                                R$ {pixPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
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
                {/* Basic Info Check */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    formData.title ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  }`}>
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Informações Básicas</p>
                    <p className="text-sm text-muted-foreground">{formData.title || 'Sem título'}</p>
                    {formData.thumbnail_url && (
                      <p className="text-xs text-success mt-1">✓ Capa adicionada</p>
                    )}
                  </div>
                </div>

                {/* Videos Check */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    videos.length > 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-foreground'
                  }`}>
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Aulas do Curso</p>
                    <p className="text-sm text-muted-foreground">
                      {videos.length > 0 
                        ? `${videos.length} aulas configuradas`
                        : 'Nenhuma aula selecionada (opcional)'}
                    </p>
                  </div>
                </div>

                {/* Pricing Check */}
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

                {/* Draft Option */}
                <div className="flex items-start gap-3 p-4 rounded-lg border">
                  <Checkbox
                    id="save_as_draft"
                    checked={formData.save_as_draft}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, save_as_draft: checked as boolean })
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="save_as_draft" className="cursor-pointer font-medium">
                      Salvar como rascunho
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      O curso não ficará visível para os alunos até ser publicado
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? () => navigate('/admin/courses') : handleBack}
        >
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
