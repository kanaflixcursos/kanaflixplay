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
import { toast } from 'sonner';
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
  ClipboardCheck
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import PandavideoFolderSelector from '@/components/PandavideoFolderSelector';

interface VideoItem {
  id: string;
  title: string;
  original_title: string;
  duration: number;
  status: string;
}

interface FormData {
  title: string;
  description: string;
  thumbnail_url: string;
  pandavideo_folder_id: string;
  pandavideo_folder_name: string;
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
  pricing_type: 'free',
  price: '',
  payment_methods: [],
  installments: '1',
};

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX' },
  { id: 'credit_card', label: 'Cartão de Crédito' },
  { id: 'boleto', label: 'Boleto Bancário' },
];

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

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  useEffect(() => {
    if (formData.pandavideo_folder_id) {
      fetchVideosFromFolder();
    }
  }, [formData.pandavideo_folder_id]);

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
      pricing_type: 'free',
      price: '',
      payment_methods: [],
      installments: '1',
    });
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

      const videoList: VideoItem[] = (data.videos || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        original_title: v.title,
        duration: v.video_player?.duration || 0,
        status: v.status,
      }));

      setVideos(videoList);
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
      const courseData = {
        title: formData.title,
        description: formData.description,
        thumbnail_url: formData.thumbnail_url,
        pandavideo_folder_id: formData.pandavideo_folder_id || null,
        is_published: false,
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

      // Save lesson order and custom titles
      if (videos.length > 0 && savedCourseId) {
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          await supabase
            .from('lessons')
            .upsert({
              course_id: savedCourseId,
              pandavideo_video_id: video.id,
              title: video.title,
              order_index: i,
              duration_minutes: Math.ceil(video.duration / 60),
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
                <div className="space-y-2">
                  <Label>Aulas disponíveis ({videos.length})</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Arraste para reordenar e edite os títulos se necessário
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
                        <span className="text-sm font-medium text-muted-foreground w-8">
                          {index + 1}.
                        </span>
                        <Input
                          value={video.title}
                          onChange={(e) => handleVideoTitleChange(index, e.target.value)}
                          className="flex-1"
                        />
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
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Tipo de Conteúdo</Label>
                <RadioGroup
                  value={formData.pricing_type}
                  onValueChange={(value: 'free' | 'paid') => 
                    setFormData({ ...formData, pricing_type: value })
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="free" id="free" />
                    <Label htmlFor="free" className="font-normal cursor-pointer">
                      Conteúdo Gratuito
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paid" id="paid" />
                    <Label htmlFor="paid" className="font-normal cursor-pointer">
                      Conteúdo Pago
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.pricing_type === 'paid' && (
                <div className="space-y-6 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="price">Valor do Curso (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="installments">Parcelamento Máximo</Label>
                      <Input
                        id="installments"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.installments}
                        onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                        placeholder="1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Máximo de parcelas permitidas (1-12)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Métodos de Pagamento</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {PAYMENT_METHODS.map((method) => (
                        <div
                          key={method.id}
                          onClick={() => togglePaymentMethod(method.id)}
                          className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            formData.payment_methods.includes(method.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={formData.payment_methods.includes(method.id)}
                            onCheckedChange={() => togglePaymentMethod(method.id)}
                          />
                          <span className="text-sm">{method.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
                          PAYMENT_METHODS.find(pm => pm.id === m)?.label
                        ).join(', ')}
                      </p>
                    )}
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
