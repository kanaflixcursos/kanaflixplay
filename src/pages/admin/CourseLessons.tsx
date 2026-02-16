import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ArrowLeft, Swap, Plus, Delete, Play as PlayIcon, Edit, Show, Hide, Paper, ChevronDown, ChevronUp } from 'react-iconly';
import { GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LessonMaterialUpload from '@/components/LessonMaterialUpload';
import PandavideoFolderSelector from '@/components/PandavideoFolderSelector';
import { Label } from '@/components/ui/label';
import { Folder } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  order_index: number;
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  course_id: string;
  is_optional: boolean;
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
  thumbnail_url: string | null;
  module_id: string | null;
}

interface Course {
  id: string;
  title: string;
  pandavideo_folder_id: string | null;
  last_synced_at: string | null;
}

// ─── Sortable Lesson Card ─────────────────────────────────────────

function SortableLessonCard({
  lesson,
  materials,
  isExpanded,
  isEditing,
  editingTitle,
  savingId,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveTitle,
  onEditingTitleChange,
  onToggleVisibility,
  onMaterialsChange,
  onPreview,
  formatDuration,
}: {
  lesson: Lesson;
  materials: LessonMaterial[];
  isExpanded: boolean;
  isEditing: boolean;
  editingTitle: string;
  savingId: string | null;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveTitle: () => void;
  onEditingTitleChange: (value: string) => void;
  onToggleVisibility: () => void;
  onMaterialsChange: () => void;
  onPreview: () => void;
  formatDuration: (minutes: number | null) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id, data: { type: 'lesson', moduleId: lesson.module_id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`${lesson.is_hidden ? 'opacity-60' : ''} ${isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}`}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none shrink-0"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Thumbnail */}
            <div
              className="relative w-16 h-10 rounded overflow-hidden bg-muted shrink-0 cursor-pointer group"
              onClick={onPreview}
            >
              {lesson.thumbnail_url ? (
                <img
                  src={lesson.thumbnail_url}
                  alt={lesson.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PlayIcon set="bold" size={16} primaryColor="var(--muted-foreground)" />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingTitle}
                    onChange={(e) => onEditingTitleChange(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveTitle();
                      if (e.key === 'Escape') onCancelEdit();
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSaveTitle} disabled={savingId === lesson.id}>
                    {savingId === lesson.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-xs">✓</span>}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelEdit}>
                    <span className="text-xs">✕</span>
                  </Button>
                </div>
              ) : (
                <div className="cursor-pointer hover:text-primary transition-colors" onClick={onStartEdit}>
                  <h3 className="font-medium text-sm truncate">{lesson.title}</h3>
                  {lesson.duration_minutes && (
                    <span className="text-xs text-muted-foreground">{formatDuration(lesson.duration_minutes)}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {lesson.is_hidden && <Badge variant="secondary" className="text-xs">Oculta</Badge>}
              {(materials?.length || 0) > 0 && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Paper set="light" size={12} />
                  {materials.length}
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleVisibility} disabled={savingId === lesson.id}>
                {savingId === lesson.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : lesson.is_hidden ? (
                  <Hide set="light" size={16} />
                ) : (
                  <Show set="light" size={16} />
                )}
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {isExpanded ? <ChevronUp set="light" size={16} /> : <ChevronDown set="light" size={16} />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="pt-3 border-t mt-3">
            <LessonMaterialUpload
              lessonId={lesson.id}
              materials={materials || []}
              onMaterialsChange={onMaterialsChange}
            />
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

// ─── Droppable Module Container ───────────────────────────────────

function DroppableModule({
  moduleId,
  children,
  isEmpty,
}: {
  moduleId: string;
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `module-drop-${moduleId}`, data: { type: 'module', moduleId } });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[48px] rounded-lg transition-colors p-2 ${
        isOver ? 'bg-primary/10 ring-1 ring-primary/30' : ''
      } ${isEmpty ? 'border border-dashed border-muted-foreground/30' : ''}`}
    >
      {isEmpty && !isOver ? (
        <p className="text-xs text-muted-foreground py-3 text-center italic">
          Arraste aulas para este módulo
        </p>
      ) : (
        children
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function CourseLessons() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [materials, setMaterials] = useState<Record<string, LessonMaterial[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(async () => {
    if (!courseId) return;

    const [{ data: courseData, error: courseError }, { data: lessonsData }, { data: modulesData }] = await Promise.all([
      supabase.from('courses').select('id, title, pandavideo_folder_id, last_synced_at').eq('id', courseId).single(),
      supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index'),
      supabase.from('course_modules').select('*').eq('course_id', courseId).order('order_index'),
    ]);

    if (courseError) {
      navigate('/admin/courses');
      return;
    }

    setCourse(courseData);
    const lessonsList = (lessonsData || []) as Lesson[];
    setLessons(lessonsList);
    setModules((modulesData || []) as Module[]);

    if (lessonsList.length > 0) {
      const { data: materialsData } = await supabase
        .from('lesson_materials')
        .select('*')
        .in('lesson_id', lessonsList.map(l => l.id))
        .order('order_index');

      const materialsByLesson: Record<string, LessonMaterial[]> = {};
      (materialsData || []).forEach((m: LessonMaterial) => {
        if (!materialsByLesson[m.lesson_id]) materialsByLesson[m.lesson_id] = [];
        materialsByLesson[m.lesson_id].push(m);
      });
      setMaterials(materialsByLesson);
    }

    setLoading(false);
  }, [courseId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Folder selection ───────────────────────────────────────────

  const handleFolderSelect = async (folder: { id: string; name: string }) => {
    if (!courseId) return;
    const { error } = await supabase
      .from('courses')
      .update({ pandavideo_folder_id: folder.id })
      .eq('id', courseId);

    if (error) {
      toast.error('Erro ao vincular pasta');
    } else {
      setCourse(prev => prev ? { ...prev, pandavideo_folder_id: folder.id } : prev);
      toast.success(`Pasta "${folder.name}" vinculada ao curso`);
    }
  };

  // ─── Module CRUD ──────────────────────────────────────────────

  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !courseId) return;
    const nextIndex = modules.length > 0 ? Math.max(...modules.map(m => m.order_index)) + 1 : 1;

    const { data, error } = await supabase
      .from('course_modules')
      .insert({ course_id: courseId, title: newModuleTitle.trim(), order_index: nextIndex })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar módulo');
    } else {
      setModules([...modules, data as Module]);
      setNewModuleTitle('');
      toast.success('Módulo criado');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    const moduleLessons = lessons.filter(l => l.module_id === moduleId);
    if (moduleLessons.length > 0) {
      toast.error('Mova as aulas para outro módulo antes de excluir');
      return;
    }

    const { error } = await supabase.from('course_modules').delete().eq('id', moduleId);
    if (error) {
      toast.error('Erro ao excluir módulo');
    } else {
      setModules(modules.filter(m => m.id !== moduleId));
      toast.success('Módulo excluído');
    }
  };

  const handleSaveModuleTitle = async (moduleId: string) => {
    if (!editingModuleTitle.trim()) return;
    const { error } = await supabase.from('course_modules').update({ title: editingModuleTitle.trim() }).eq('id', moduleId);
    if (error) {
      toast.error('Erro ao atualizar módulo');
    } else {
      setModules(modules.map(m => m.id === moduleId ? { ...m, title: editingModuleTitle.trim() } : m));
      setEditingModuleId(null);
    }
  };

  const toggleModuleOptional = async (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const { error } = await supabase.from('course_modules').update({ is_optional: !mod.is_optional }).eq('id', moduleId);
    if (!error) {
      setModules(modules.map(m => m.id === moduleId ? { ...m, is_optional: !m.is_optional } : m));
    }
  };

  // ─── Lesson actions ───────────────────────────────────────────

  const handleSync = async () => {
    if (!course?.pandavideo_folder_id) {
      toast.error('Este curso não tem uma pasta do Pandavideo vinculada');
      return;
    }
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-pandavideo-lessons', { body: { courseId } });
      if (error) throw error;
      toast.success('Aulas sincronizadas!');
      fetchData();
    } catch {
      toast.error('Erro ao sincronizar aulas');
    } finally {
      setSyncing(false);
    }
  };

  const handleStartEdit = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setEditingTitle(lesson.title);
  };

  const handleSaveTitle = async (lessonId: string) => {
    if (!editingTitle.trim()) return;
    setSavingId(lessonId);
    const { error } = await supabase.from('lessons').update({ title: editingTitle.trim() }).eq('id', lessonId);
    if (error) {
      toast.error('Erro ao salvar título');
    } else {
      setEditingLessonId(null);
      fetchData();
    }
    setSavingId(null);
  };

  const handleToggleVisibility = async (lesson: Lesson) => {
    setSavingId(lesson.id);
    const { error } = await supabase.from('lessons').update({ is_hidden: !lesson.is_hidden }).eq('id', lesson.id);
    if (!error) fetchData();
    setSavingId(null);
  };

  const toggleExpanded = (lessonId: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      next.has(lessonId) ? next.delete(lessonId) : next.add(lessonId);
      return next;
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`;
  };

  // ─── Drag & Drop ──────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeLesson = lessons.find(l => l.id === active.id);
    if (!activeLesson) return;

    // Determine target module
    let targetModuleId: string | null = null;

    if (over.data.current?.type === 'module') {
      targetModuleId = over.data.current.moduleId;
    } else if (over.data.current?.type === 'lesson') {
      targetModuleId = over.data.current.moduleId;
    } else if (typeof over.id === 'string' && over.id.startsWith('module-drop-')) {
      targetModuleId = over.id.replace('module-drop-', '');
    }

    if (targetModuleId && activeLesson.module_id !== targetModuleId) {
      setLessons(prev => prev.map(l => l.id === active.id ? { ...l, module_id: targetModuleId } : l));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeLesson = lessons.find(l => l.id === active.id);
    if (!activeLesson) return;

    // Determine target module
    let targetModuleId = activeLesson.module_id;
    if (over.data.current?.type === 'module') {
      targetModuleId = over.data.current.moduleId;
    } else if (over.data.current?.type === 'lesson') {
      targetModuleId = over.data.current.moduleId;
    }

    // Update module assignment if changed
    const originalLesson = lessons.find(l => l.id === active.id);
    
    // Get lessons in the same module for reordering
    let moduleLessons = lessons.filter(l => l.module_id === targetModuleId);

    if (active.id !== over.id && over.data.current?.type === 'lesson') {
      const oldIndex = moduleLessons.findIndex(l => l.id === active.id);
      const newIndex = moduleLessons.findIndex(l => l.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        moduleLessons = arrayMove(moduleLessons, oldIndex, newIndex);
      }
    }

    // Persist order and module assignment
    try {
      const updates = moduleLessons.map((lesson, index) => ({
        id: lesson.id,
        order_index: index + 1,
        module_id: targetModuleId,
      }));

      for (const update of updates) {
        await supabase.from('lessons').update({ order_index: update.order_index, module_id: update.module_id }).eq('id', update.id);
      }

      // If lesson moved between modules, also persist the module_id change
      if (originalLesson && originalLesson.module_id !== targetModuleId) {
        await supabase.from('lessons').update({ module_id: targetModuleId }).eq('id', String(active.id));
      }

      fetchData();
    } catch {
      toast.error('Erro ao reordenar');
      fetchData();
    }
  };

  // ─── Unassigned lessons (for migration) ───────────────────────

  const unassignedLessons = lessons.filter(l => !l.module_id);

  // ─── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/courses')}>
          <ArrowLeft set="light" size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-medium">{course?.title}</h1>
          <p className="text-sm text-muted-foreground">
            Organize módulos e aulas • Arraste para reordenar
          </p>
        </div>
        {course?.pandavideo_folder_id && (
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Swap set="light" size={16} style={{ marginRight: 8 }} />}
            Sincronizar
          </Button>
        )}
      </div>

      {/* Pandavideo Folder Selector */}
      <div className="space-y-2">
        <Label className="text-sm">Pasta de Vídeos (Pandavideo)</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 p-2.5 rounded-lg border bg-muted/50 flex items-center">
            {course?.pandavideo_folder_id ? (
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-primary" />
                <span className="text-sm">Pasta vinculada</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Nenhuma pasta selecionada</span>
            )}
          </div>
          <PandavideoFolderSelector
            onSelect={handleFolderSelect}
            selectedFolderId={course?.pandavideo_folder_id || ''}
          />
        </div>
      </div>

      {course?.last_synced_at && (
        <p className="text-xs text-muted-foreground">
          Última sincronização: {new Date(course.last_synced_at).toLocaleString('pt-BR')}
        </p>
      )}

      {/* Add Module */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nome do novo módulo..."
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddModule();
          }}
          className="flex-1"
        />
        <Button onClick={handleAddModule} disabled={!newModuleTitle.trim()} size="sm">
          <Plus set="light" size={16} style={{ marginRight: 4 }} />
          Módulo
        </Button>
      </div>

      {/* Modules with lessons */}
      {modules.length === 0 && lessons.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">Crie um módulo para começar a organizar as aulas.</p>
            {course?.pandavideo_folder_id && (
              <Button onClick={handleSync} disabled={syncing} variant="outline">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Swap set="light" size={16} style={{ marginRight: 8 }} />}
                Sincronizar do Pandavideo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Unassigned lessons warning */}
          {unassignedLessons.length > 0 && modules.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5 mb-4">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-destructive mb-2">
                  {unassignedLessons.length} aula(s) sem módulo
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Arraste-as para um módulo abaixo. Todas as aulas devem pertencer a um módulo.
                </p>
                <SortableContext items={unassignedLessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {unassignedLessons.map((lesson) => (
                      <SortableLessonCard
                        key={lesson.id}
                        lesson={lesson}
                        materials={materials[lesson.id] || []}
                        isExpanded={expandedLessons.has(lesson.id)}
                        isEditing={editingLessonId === lesson.id}
                        editingTitle={editingTitle}
                        savingId={savingId}
                        onToggleExpand={() => toggleExpanded(lesson.id)}
                        onStartEdit={() => handleStartEdit(lesson)}
                        onCancelEdit={() => { setEditingLessonId(null); setEditingTitle(''); }}
                        onSaveTitle={() => handleSaveTitle(lesson.id)}
                        onEditingTitleChange={setEditingTitle}
                        onToggleVisibility={() => handleToggleVisibility(lesson)}
                        onMaterialsChange={fetchData}
                        onPreview={() => setPreviewLesson(lesson)}
                        formatDuration={formatDuration}
                      />
                    ))}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          )}
          <div className="space-y-4">
            {modules.map((mod) => {
              const moduleLessons = lessons
                .filter(l => l.module_id === mod.id)
                .sort((a, b) => a.order_index - b.order_index);

              return (
                <div key={mod.id} className="border rounded-lg overflow-hidden">
                  {/* Module Header */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50">
                    {editingModuleId === mod.id ? (
                      <Input
                        value={editingModuleTitle}
                        onChange={(e) => setEditingModuleTitle(e.target.value)}
                        className="h-7 text-sm font-medium flex-1"
                        autoFocus
                        onBlur={() => handleSaveModuleTitle(mod.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveModuleTitle(mod.id);
                          if (e.key === 'Escape') setEditingModuleId(null);
                        }}
                      />
                    ) : (
                      <h3
                        className="text-sm font-semibold flex-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          setEditingModuleId(mod.id);
                          setEditingModuleTitle(mod.title);
                        }}
                      >
                        {mod.title}
                      </h3>
                    )}

                    <Badge
                      variant={mod.is_optional ? 'outline' : 'default'}
                      className={`text-xs cursor-pointer select-none ${
                        mod.is_optional ? 'border-dashed text-muted-foreground' : ''
                      }`}
                      onClick={() => toggleModuleOptional(mod.id)}
                    >
                      {mod.is_optional ? 'Opcional' : 'Obrigatório'}
                    </Badge>

                    <Badge variant="secondary" className="text-xs">
                      {moduleLessons.length} aulas
                    </Badge>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteModule(mod.id)}
                    >
                      <Delete set="light" size={16} />
                    </Button>
                  </div>

                  {/* Module Lessons */}
                  <DroppableModule moduleId={mod.id} isEmpty={moduleLessons.length === 0}>
                    <SortableContext items={moduleLessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                      {moduleLessons.map((lesson) => (
                        <SortableLessonCard
                          key={lesson.id}
                          lesson={lesson}
                          materials={materials[lesson.id] || []}
                          isExpanded={expandedLessons.has(lesson.id)}
                          isEditing={editingLessonId === lesson.id}
                          editingTitle={editingTitle}
                          savingId={savingId}
                          onToggleExpand={() => toggleExpanded(lesson.id)}
                          onStartEdit={() => handleStartEdit(lesson)}
                          onCancelEdit={() => { setEditingLessonId(null); setEditingTitle(''); }}
                          onSaveTitle={() => handleSaveTitle(lesson.id)}
                          onEditingTitleChange={setEditingTitle}
                          onToggleVisibility={() => handleToggleVisibility(lesson)}
                          onMaterialsChange={fetchData}
                          onPreview={() => setPreviewLesson(lesson)}
                          formatDuration={formatDuration}
                        />
                      ))}
                    </SortableContext>
                  </DroppableModule>
                </div>
              );
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId ? (
              <div className="bg-card border rounded-lg shadow-xl p-3 opacity-90">
                <p className="text-sm font-medium truncate">
                  {lessons.find(l => l.id === activeId)?.title}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Video Preview Dialog */}
      <Dialog open={!!previewLesson} onOpenChange={() => setPreviewLesson(null)}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewLesson?.title}</DialogTitle>
          </DialogHeader>
          {previewLesson?.video_url && (
            <div className="aspect-video w-full">
              <iframe
                src={previewLesson.video_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
