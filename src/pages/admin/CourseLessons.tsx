import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Loader2, 
  PlayCircle, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import LessonMaterialUpload from '@/components/LessonMaterialUpload';

interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  order_index: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  order_index: number;
  duration_minutes: number | null;
  pandavideo_video_id: string | null;
  is_hidden: boolean;
}

interface Course {
  id: string;
  title: string;
  pandavideo_folder_id: string | null;
  last_synced_at: string | null;
}

export default function CourseLessons() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Record<string, LessonMaterial[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    if (!courseId) return;

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('id, title, pandavideo_folder_id, last_synced_at')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      navigate('/admin/courses');
      return;
    }

    setCourse(courseData);

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    const lessonsList = (lessonsData || []) as Lesson[];
    setLessons(lessonsList);

    // Fetch materials for all lessons
    if (lessonsList.length > 0) {
      const lessonIds = lessonsList.map(l => l.id);
      const { data: materialsData } = await supabase
        .from('lesson_materials')
        .select('*')
        .in('lesson_id', lessonIds)
        .order('order_index');

      const materialsByLesson: Record<string, LessonMaterial[]> = {};
      (materialsData || []).forEach((material: LessonMaterial) => {
        if (!materialsByLesson[material.lesson_id]) {
          materialsByLesson[material.lesson_id] = [];
        }
        materialsByLesson[material.lesson_id].push(material);
      });
      setMaterials(materialsByLesson);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const handleSync = async () => {
    if (!course?.pandavideo_folder_id) {
      toast.error('Este curso não tem uma pasta do Pandavideo vinculada');
      return;
    }

    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-pandavideo-lessons', {
        body: { courseId },
      });

      if (error) throw error;

      toast.success('Aulas sincronizadas com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar aulas');
    } finally {
      setSyncing(false);
    }
  };

  const handleStartEdit = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setEditingTitle(lesson.title);
  };

  const handleCancelEdit = () => {
    setEditingLessonId(null);
    setEditingTitle('');
  };

  const handleSaveTitle = async (lessonId: string) => {
    if (!editingTitle.trim()) {
      toast.error('O título não pode estar vazio');
      return;
    }

    setSavingId(lessonId);
    const { error } = await supabase
      .from('lessons')
      .update({ title: editingTitle.trim() })
      .eq('id', lessonId);

    if (error) {
      toast.error('Erro ao salvar título');
    } else {
      toast.success('Título atualizado');
      setEditingLessonId(null);
      fetchData();
    }
    setSavingId(null);
  };

  const handleToggleVisibility = async (lesson: Lesson) => {
    setSavingId(lesson.id);
    const { error } = await supabase
      .from('lessons')
      .update({ is_hidden: !lesson.is_hidden })
      .eq('id', lesson.id);

    if (error) {
      toast.error('Erro ao alterar visibilidade');
    } else {
      toast.success(lesson.is_hidden ? 'Aula visível' : 'Aula ocultada');
      fetchData();
    }
    setSavingId(null);
  };

  const toggleExpanded = (lessonId: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}min`;
    }
    return `${mins}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-medium">Aulas: {course?.title}</h1>
          <p className="text-muted-foreground">
            {course?.pandavideo_folder_id 
              ? 'Aulas sincronizadas do Pandavideo'
              : 'Nenhuma pasta do Pandavideo vinculada'}
          </p>
        </div>
        {course?.pandavideo_folder_id && (
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        )}
      </div>

      {course?.last_synced_at && (
        <p className="text-sm text-muted-foreground">
          Última sincronização: {new Date(course.last_synced_at).toLocaleString('pt-BR')}
        </p>
      )}

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <PlayCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma aula encontrada.</p>
            {course?.pandavideo_folder_id && (
              <Button onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar do Pandavideo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, index) => (
            <Card 
              key={lesson.id} 
              className={lesson.is_hidden ? 'opacity-60' : ''}
            >
              <Collapsible
                open={expandedLessons.has(lesson.id)}
                onOpenChange={() => toggleExpanded(lesson.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {editingLessonId === lesson.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTitle(lesson.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSaveTitle(lesson.id)}
                            disabled={savingId === lesson.id}
                          >
                            {savingId === lesson.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleStartEdit(lesson)}
                        >
                          <h3 className="font-medium truncate">{lesson.title}</h3>
                          {lesson.duration_minutes && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(lesson.duration_minutes)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {lesson.is_hidden && (
                        <Badge variant="secondary">Oculta</Badge>
                      )}
                      
                      {(materials[lesson.id]?.length || 0) > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" />
                          {materials[lesson.id].length}
                        </Badge>
                      )}

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleVisibility(lesson)}
                        disabled={savingId === lesson.id}
                        title={lesson.is_hidden ? 'Tornar visível' : 'Ocultar aula'}
                      >
                        {savingId === lesson.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : lesson.is_hidden ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>

                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          {expandedLessons.has(lesson.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent className="pt-4 border-t mt-4">
                    <LessonMaterialUpload
                      lessonId={lesson.id}
                      materials={materials[lesson.id] || []}
                      onMaterialsChange={fetchData}
                    />
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
