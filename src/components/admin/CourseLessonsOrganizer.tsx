import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Folder, ArrowUp, ArrowDown, ArrowRightLeft } from 'lucide-react';
import { Swap, Plus, Delete, Play as PlayIcon, Show, Hide, Paper, ChevronDown, ChevronUp } from 'react-iconly';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LessonMaterialUpload from '@/components/LessonMaterialUpload';
import PandavideoFolderSelector from '@/components/PandavideoFolderSelector';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────

interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  order_index: number;
}

export interface OrganizerModule {
  id: string;
  title: string;
  order_index: number;
  is_optional: boolean;
}

export interface OrganizerLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  order_index: number;
  duration_minutes: number | null;
  duration_seconds?: number;
  pandavideo_video_id: string | null;
  is_hidden: boolean;
  thumbnail_url: string | null;
  module_id: string | null;
}

export interface CourseLessonsOrganizerRef {
  save: (courseId: string) => Promise<void>;
  getModules: () => OrganizerModule[];
  getLessons: () => OrganizerLesson[];
}

interface CourseLessonsOrganizerProps {
  courseId?: string;
  pandavideoFolderId?: string;
  onFolderChange?: (folderId: string, folderName: string) => void;
  showFolderSelector?: boolean;
}

// ─── Lesson Card ──────────────────────────────────────────────────

function LessonCard({
  lesson,
  index,
  totalInModule,
  materials,
  modules,
  currentModuleId,
  isExpanded,
  isEditingTitle,
  editingTitle,
  savingId,
  showMaterials,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveTitle,
  onEditingTitleChange,
  onToggleVisibility,
  onMaterialsChange,
  onPreview,
  onMoveUp,
  onMoveDown,
  onMoveToModule,
  formatDuration,
}: {
  lesson: OrganizerLesson;
  index: number;
  totalInModule: number;
  materials: LessonMaterial[];
  modules: OrganizerModule[];
  currentModuleId: string;
  isExpanded: boolean;
  isEditingTitle: boolean;
  editingTitle: string;
  savingId: string | null;
  showMaterials: boolean;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveTitle: () => void;
  onEditingTitleChange: (value: string) => void;
  onToggleVisibility: () => void;
  onMaterialsChange: () => void;
  onPreview: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToModule: (targetModuleId: string) => void;
  formatDuration: (lesson: OrganizerLesson) => string;
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < totalInModule - 1;
  const otherModules = modules.filter(m => m.id !== currentModuleId);

  return (
    <Card className={lesson.is_hidden ? 'opacity-60' : ''}>
      <Collapsible open={isExpanded && showMaterials} onOpenChange={onToggleExpand}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            {/* Order buttons */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onMoveUp}
                disabled={!canMoveUp}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onMoveDown}
                disabled={!canMoveDown}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>

            <span className="text-xs text-muted-foreground font-mono w-5 text-center shrink-0">
              {index + 1}
            </span>

            <div
              className="relative w-16 h-10 rounded overflow-hidden bg-muted shrink-0 cursor-pointer group"
              onClick={onPreview}
            >
              {lesson.thumbnail_url ? (
                <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PlayIcon set="bold" size={16} primaryColor="var(--muted-foreground)" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
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
                  <span className="text-xs text-muted-foreground">{formatDuration(lesson)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {lesson.is_hidden && <Badge variant="secondary" className="text-xs">Oculta</Badge>}
              {showMaterials && (materials?.length || 0) > 0 && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Paper set="light" size={12} />
                  {materials.length}
                </Badge>
              )}

              {/* Move to module dropdown */}
              {otherModules.length > 0 && (
                <Select onValueChange={onMoveToModule}>
                  <SelectTrigger className="h-7 w-7 p-0 border-0 [&>svg]:hidden">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherModules.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        Mover para: {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              {showMaterials && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {isExpanded ? <ChevronUp set="light" size={16} /> : <ChevronDown set="light" size={16} />}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {showMaterials && (
            <CollapsibleContent className="pt-3 border-t mt-3">
              <LessonMaterialUpload
                lessonId={lesson.id}
                materials={materials || []}
                onMaterialsChange={onMaterialsChange}
              />
            </CollapsibleContent>
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────

const CourseLessonsOrganizer = forwardRef<CourseLessonsOrganizerRef, CourseLessonsOrganizerProps>(
  ({ courseId, pandavideoFolderId, onFolderChange, showFolderSelector = true }, ref) => {
    const isEditMode = Boolean(courseId);

    const [lessons, setLessons] = useState<OrganizerLesson[]>([]);
    const [modules, setModules] = useState<OrganizerModule[]>([
      { id: 'local-default-module', title: 'Módulo Único', order_index: 1, is_optional: false },
    ]);
    const [materials, setMaterials] = useState<Record<string, LessonMaterial[]>>({});
    const [loading, setLoading] = useState(isEditMode);
    const [syncing, setSyncing] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
    const [previewLesson, setPreviewLesson] = useState<OrganizerLesson | null>(null);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const [editingModuleTitle, setEditingModuleTitle] = useState('');
    const [currentFolderId, setCurrentFolderId] = useState(pandavideoFolderId || '');
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

    // ─── Load data (edit mode) ────────────────────────────────────

    const fetchData = useCallback(async () => {
      if (!courseId) return;

      const [{ data: courseData, error: courseError }, { data: lessonsData }, { data: modulesData }] = await Promise.all([
        supabase.from('courses').select('id, title, pandavideo_folder_id, last_synced_at').eq('id', courseId).single(),
        supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index'),
        supabase.from('course_modules').select('*').eq('course_id', courseId).order('order_index'),
      ]);

      if (courseError) return;

      setCurrentFolderId(courseData.pandavideo_folder_id || '');
      setLastSyncedAt(courseData.last_synced_at);

      const lessonsList = (lessonsData || []) as OrganizerLesson[];
      let modulesList = (modulesData || []) as (OrganizerModule & { course_id?: string })[];

      if (modulesList.length === 0) {
        const { data: newModule, error: modError } = await supabase
          .from('course_modules')
          .insert({ course_id: courseId, title: 'Módulo Único', order_index: 1 })
          .select()
          .single();
        if (!modError && newModule) {
          modulesList = [newModule as any];
        }
      }

      const firstModule = modulesList[0];
      if (firstModule) {
        const unassigned = lessonsList.filter(l => !l.module_id);
        if (unassigned.length > 0) {
          for (const lesson of unassigned) {
            await supabase.from('lessons').update({ module_id: firstModule.id }).eq('id', lesson.id);
            lesson.module_id = firstModule.id;
          }
        }
      }

      setLessons(lessonsList);
      setModules(modulesList.map(m => ({ id: m.id, title: m.title, order_index: m.order_index, is_optional: m.is_optional })));

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
    }, [courseId]);

    // ─── Load videos from folder (create mode) ───────────────────

    const fetchVideosFromFolder = useCallback(async (folderId: string) => {
      if (!folderId) return;
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const response = await fetch(
          `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/pandavideo?action=list&folder_id=${folderId}`,
          { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
        );

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao buscar vídeos');

        const firstModuleId = modules[0]?.id || 'local-default-module';

        const pandaLessons: OrganizerLesson[] = (data.videos || []).map((v: any, idx: number) => {
          let durationSeconds = 0;
          if (v.length && typeof v.length === 'number') durationSeconds = v.length;
          else if (v.video_player?.duration) durationSeconds = v.video_player.duration;
          else if (v.duration && typeof v.duration === 'number') durationSeconds = v.duration;

          return {
            id: v.id,
            title: v.title,
            description: null,
            video_url: null,
            order_index: idx + 1,
            duration_minutes: durationSeconds ? Math.ceil(durationSeconds / 60) : null,
            duration_seconds: durationSeconds,
            pandavideo_video_id: v.id,
            is_hidden: false,
            thumbnail_url: null,
            module_id: firstModuleId,
          };
        });

        setLessons(pandaLessons);
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast.error('Erro ao carregar vídeos da pasta');
      } finally {
        setLoading(false);
      }
    }, [modules]);

    useEffect(() => {
      if (isEditMode) {
        fetchData();
      }
    }, [isEditMode, fetchData]);

    useEffect(() => {
      if (!isEditMode && pandavideoFolderId) {
        setCurrentFolderId(pandavideoFolderId);
        fetchVideosFromFolder(pandavideoFolderId);
      }
    }, [isEditMode, pandavideoFolderId]);

    // ─── Imperative handle ────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      save: async (targetCourseId: string) => {
        const moduleIdMap = new Map<string, string>();

        for (const mod of modules) {
          const isLocal = mod.id.startsWith('local-');
          if (isLocal) {
            const { data: newMod } = await supabase
              .from('course_modules')
              .insert({
                course_id: targetCourseId,
                title: mod.title,
                order_index: mod.order_index,
                is_optional: mod.is_optional,
              })
              .select('id')
              .single();
            if (newMod) moduleIdMap.set(mod.id, newMod.id);
          } else {
            await supabase
              .from('course_modules')
              .update({ title: mod.title, order_index: mod.order_index, is_optional: mod.is_optional })
              .eq('id', mod.id);
            moduleIdMap.set(mod.id, mod.id);
          }
        }

        if (!isEditMode && currentFolderId) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              await supabase.functions.invoke('sync-pandavideo-lessons', {
                body: { courseId: targetCourseId },
                headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
              });
            }
          } catch (err) {
            console.error('Sync error:', err);
          }
        }

        const { data: dbLessons } = await supabase
          .from('lessons')
          .select('id, pandavideo_video_id')
          .eq('course_id', targetCourseId);

        if (dbLessons && dbLessons.length > 0) {
          const byVideoId = new Map(dbLessons.map(l => [l.pandavideo_video_id, l.id]));

          for (const mod of modules) {
            const realModuleId = moduleIdMap.get(mod.id) || mod.id;
            const moduleLessons = lessons
              .filter(l => l.module_id === mod.id)
              .sort((a, b) => a.order_index - b.order_index);

            for (let i = 0; i < moduleLessons.length; i++) {
              const lesson = moduleLessons[i];
              const dbLessonId = byVideoId.get(lesson.pandavideo_video_id) || lesson.id;
              const isRealId = dbLessons.some(l => l.id === dbLessonId);
              if (!isRealId) continue;

              await supabase
                .from('lessons')
                .update({
                  title: lesson.title,
                  order_index: i + 1,
                  module_id: realModuleId,
                  is_hidden: lesson.is_hidden,
                })
                .eq('id', dbLessonId);
            }
          }
        }
      },
      getModules: () => modules,
      getLessons: () => lessons,
    }), [modules, lessons, isEditMode, currentFolderId]);

    // ─── Folder selection ─────────────────────────────────────────

    const handleFolderSelect = async (folder: { id: string; name: string }) => {
      if (isEditMode && courseId) {
        const { error } = await supabase
          .from('courses')
          .update({ pandavideo_folder_id: folder.id })
          .eq('id', courseId);
        if (error) {
          toast.error('Erro ao vincular pasta');
          return;
        }
      }
      setCurrentFolderId(folder.id);
      onFolderChange?.(folder.id, folder.name);
      if (!isEditMode) {
        fetchVideosFromFolder(folder.id);
      } else {
        toast.success(`Pasta "${folder.name}" vinculada ao curso`);
      }
    };

    // ─── Module CRUD ──────────────────────────────────────────────

    const handleAddModule = async () => {
      if (!newModuleTitle.trim()) return;
      const nextIndex = modules.length > 0 ? Math.max(...modules.map(m => m.order_index)) + 1 : 1;

      if (isEditMode && courseId) {
        const { data, error } = await supabase
          .from('course_modules')
          .insert({ course_id: courseId, title: newModuleTitle.trim(), order_index: nextIndex })
          .select()
          .single();
        if (error) { toast.error('Erro ao criar módulo'); return; }
        setModules([...modules, { id: data.id, title: data.title, order_index: data.order_index, is_optional: data.is_optional }]);
      } else {
        setModules([...modules, {
          id: `local-${Date.now()}`,
          title: newModuleTitle.trim(),
          order_index: nextIndex,
          is_optional: false,
        }]);
      }
      setNewModuleTitle('');
    };

    const handleDeleteModule = async (moduleId: string) => {
      if (modules.length <= 1) {
        toast.error('O curso deve ter pelo menos um módulo');
        return;
      }

      const moduleLessons = lessons.filter(l => l.module_id === moduleId);
      const remainingModules = modules.filter(m => m.id !== moduleId);
      const targetModuleId = remainingModules[0].id;

      if (moduleLessons.length > 0) {
        const updatedLessons = lessons.map(l =>
          l.module_id === moduleId ? { ...l, module_id: targetModuleId } : l
        );
        setLessons(updatedLessons);

        if (isEditMode) {
          for (const lesson of moduleLessons) {
            await supabase.from('lessons').update({ module_id: targetModuleId }).eq('id', lesson.id);
          }
        }
      }

      if (isEditMode) {
        const { error } = await supabase.from('course_modules').delete().eq('id', moduleId);
        if (error) { toast.error('Erro ao excluir módulo'); return; }
      }

      setModules(remainingModules);
    };

    const handleSaveModuleTitle = async (moduleId: string) => {
      if (!editingModuleTitle.trim()) return;
      if (isEditMode) {
        const { error } = await supabase.from('course_modules').update({ title: editingModuleTitle.trim() }).eq('id', moduleId);
        if (error) { toast.error('Erro ao atualizar módulo'); return; }
      }
      setModules(modules.map(m => m.id === moduleId ? { ...m, title: editingModuleTitle.trim() } : m));
      setEditingModuleId(null);
    };

    const toggleModuleOptional = async (moduleId: string) => {
      const mod = modules.find(m => m.id === moduleId);
      if (!mod) return;
      if (isEditMode) {
        await supabase.from('course_modules').update({ is_optional: !mod.is_optional }).eq('id', moduleId);
      }
      setModules(modules.map(m => m.id === moduleId ? { ...m, is_optional: !m.is_optional } : m));
    };

    // ─── Lesson ordering ──────────────────────────────────────────

    const moveLessonInModule = async (lessonId: string, moduleId: string, direction: 'up' | 'down') => {
      const moduleLessons = lessons
        .filter(l => l.module_id === moduleId)
        .sort((a, b) => a.order_index - b.order_index);

      const idx = moduleLessons.findIndex(l => l.id === lessonId);
      if (idx === -1) return;

      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= moduleLessons.length) return;

      // Swap order_index values
      const currentOrder = moduleLessons[idx].order_index;
      const swapOrder = moduleLessons[swapIdx].order_index;

      const updatedLessons = lessons.map(l => {
        if (l.id === moduleLessons[idx].id) return { ...l, order_index: swapOrder };
        if (l.id === moduleLessons[swapIdx].id) return { ...l, order_index: currentOrder };
        return l;
      });

      setLessons(updatedLessons);

      if (isEditMode) {
        await Promise.all([
          supabase.from('lessons').update({ order_index: swapOrder }).eq('id', moduleLessons[idx].id),
          supabase.from('lessons').update({ order_index: currentOrder }).eq('id', moduleLessons[swapIdx].id),
        ]);
      }
    };

    const moveLessonToModule = async (lessonId: string, targetModuleId: string) => {
      const targetLessons = lessons.filter(l => l.module_id === targetModuleId);
      const newOrder = targetLessons.length > 0 ? Math.max(...targetLessons.map(l => l.order_index)) + 1 : 1;

      setLessons(prev => prev.map(l =>
        l.id === lessonId ? { ...l, module_id: targetModuleId, order_index: newOrder } : l
      ));

      if (isEditMode) {
        await supabase.from('lessons').update({ module_id: targetModuleId, order_index: newOrder }).eq('id', lessonId);
      }
    };

    // ─── Lesson actions ─────────────────────────────────────────

    const handleSync = async () => {
      if (!currentFolderId || !courseId) return;
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

    const handleStartEdit = (lesson: OrganizerLesson) => {
      setEditingLessonId(lesson.id);
      setEditingTitle(lesson.title);
    };

    const handleSaveTitle = async (lessonId: string) => {
      if (!editingTitle.trim()) return;
      setSavingId(lessonId);

      if (isEditMode) {
        const { error } = await supabase.from('lessons').update({ title: editingTitle.trim() }).eq('id', lessonId);
        if (error) toast.error('Erro ao salvar título');
      }

      setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, title: editingTitle.trim() } : l));
      setEditingLessonId(null);
      setSavingId(null);
    };

    const handleToggleVisibility = async (lesson: OrganizerLesson) => {
      setSavingId(lesson.id);
      if (isEditMode) {
        await supabase.from('lessons').update({ is_hidden: !lesson.is_hidden }).eq('id', lesson.id);
      }
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, is_hidden: !l.is_hidden } : l));
      setSavingId(null);
    };

    const toggleExpanded = (lessonId: string) => {
      setExpandedLessons(prev => {
        const next = new Set(prev);
        next.has(lessonId) ? next.delete(lessonId) : next.add(lessonId);
        return next;
      });
    };

    const formatDuration = (lesson: OrganizerLesson) => {
      if (lesson.duration_seconds) {
        const mins = Math.floor(lesson.duration_seconds / 60);
        const secs = Math.floor(lesson.duration_seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      }
      if (!lesson.duration_minutes) return '';
      const hrs = Math.floor(lesson.duration_minutes / 60);
      const mins = lesson.duration_minutes % 60;
      return hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`;
    };

    // ─── Render ───────────────────────────────────────────────────

    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Folder Selector */}
        {showFolderSelector && (
          <div className="space-y-2">
            <Label className="text-sm">Pasta de Vídeos (Pandavideo)</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2.5 rounded-lg border bg-muted/50 flex items-center">
                {currentFolderId ? (
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
                selectedFolderId={currentFolderId}
              />
            </div>
          </div>
        )}

        {/* Last sync info */}
        {isEditMode && lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Última sincronização: {new Date(lastSyncedAt).toLocaleString('pt-BR')}
          </p>
        )}

        {/* Add Module */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Nome do novo módulo..."
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); }}
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
              <p className="text-muted-foreground">
                {currentFolderId
                  ? 'Nenhuma aula encontrada. Sincronize do Pandavideo.'
                  : 'Selecione uma pasta do Pandavideo para importar as aulas.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {modules.map((mod) => {
              const moduleLessons = lessons
                .filter(l => l.module_id === mod.id)
                .sort((a, b) => a.order_index - b.order_index);

              return (
                <div key={mod.id} className="border rounded-lg overflow-hidden">
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

                  <div className="space-y-2 p-2">
                    {moduleLessons.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center italic">
                        Nenhuma aula neste módulo
                      </p>
                    ) : (
                      moduleLessons.map((lesson, idx) => (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          index={idx}
                          totalInModule={moduleLessons.length}
                          materials={materials[lesson.id] || []}
                          modules={modules}
                          currentModuleId={mod.id}
                          isExpanded={expandedLessons.has(lesson.id)}
                          isEditingTitle={editingLessonId === lesson.id}
                          editingTitle={editingTitle}
                          savingId={savingId}
                          showMaterials={isEditMode}
                          onToggleExpand={() => toggleExpanded(lesson.id)}
                          onStartEdit={() => handleStartEdit(lesson)}
                          onCancelEdit={() => { setEditingLessonId(null); setEditingTitle(''); }}
                          onSaveTitle={() => handleSaveTitle(lesson.id)}
                          onEditingTitleChange={setEditingTitle}
                          onToggleVisibility={() => handleToggleVisibility(lesson)}
                          onMaterialsChange={isEditMode ? fetchData : () => {}}
                          onPreview={() => setPreviewLesson(lesson)}
                          onMoveUp={() => moveLessonInModule(lesson.id, mod.id, 'up')}
                          onMoveDown={() => moveLessonInModule(lesson.id, mod.id, 'down')}
                          onMoveToModule={(targetModuleId) => moveLessonToModule(lesson.id, targetModuleId)}
                          formatDuration={formatDuration}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
);

CourseLessonsOrganizer.displayName = 'CourseLessonsOrganizer';

export default CourseLessonsOrganizer;
