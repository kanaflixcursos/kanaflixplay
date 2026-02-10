import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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
import { Loader2, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Module {
  id: string;
  title: string;
  order_index: number;
  course_id: string;
}

interface Lesson {
  id: string;
  title: string;
  order_index: number;
  module_id: string | null;
}

interface ModuleManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  onModulesChanged: () => void;
}

export default function ModuleManagerModal({
  open,
  onOpenChange,
  courseId,
  onModulesChanged,
}: ModuleManagerModalProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, courseId]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: modulesData }, { data: lessonsData }] = await Promise.all([
      supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index'),
      supabase
        .from('lessons')
        .select('id, title, order_index, module_id')
        .eq('course_id', courseId)
        .order('order_index'),
    ]);

    setModules((modulesData || []) as Module[]);
    setLessons((lessonsData || []) as Lesson[]);
    setLoading(false);
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;

    const nextIndex = modules.length > 0 
      ? Math.max(...modules.map(m => m.order_index)) + 1 
      : 1;

    const { data, error } = await supabase
      .from('course_modules')
      .insert({
        course_id: courseId,
        title: newModuleTitle.trim(),
        order_index: nextIndex,
      })
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
    // First, unassign lessons from this module
    const { error: lessonsError } = await supabase
      .from('lessons')
      .update({ module_id: null })
      .eq('module_id', moduleId);

    if (lessonsError) {
      toast.error('Erro ao desassociar aulas');
      return;
    }

    const { error } = await supabase
      .from('course_modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      toast.error('Erro ao excluir módulo');
    } else {
      setModules(modules.filter(m => m.id !== moduleId));
      setLessons(lessons.map(l => l.module_id === moduleId ? { ...l, module_id: null } : l));
      toast.success('Módulo excluído');
    }
  };

  const handleUpdateModuleTitle = async (moduleId: string, title: string) => {
    const { error } = await supabase
      .from('course_modules')
      .update({ title })
      .eq('id', moduleId);

    if (error) {
      toast.error('Erro ao atualizar módulo');
    } else {
      setModules(modules.map(m => m.id === moduleId ? { ...m, title } : m));
    }
  };

  const handleAssignLesson = async (lessonId: string, moduleId: string | null) => {
    const { error } = await supabase
      .from('lessons')
      .update({ module_id: moduleId })
      .eq('id', lessonId);

    if (error) {
      toast.error('Erro ao atribuir aula');
    } else {
      setLessons(lessons.map(l => l.id === lessonId ? { ...l, module_id: moduleId } : l));
    }
  };

  const handleClose = () => {
    onModulesChanged();
    onOpenChange(false);
  };

  const getLessonsByModule = (moduleId: string | null) => {
    return lessons.filter(l => l.module_id === moduleId);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Módulos</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add module */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do novo módulo..."
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddModule();
                }}
              />
              <Button onClick={handleAddModule} disabled={!newModuleTitle.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Modules list */}
            {modules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum módulo criado. Crie módulos para organizar as aulas.
              </p>
            ) : (
              <div className="space-y-4">
                {modules.map((module) => {
                  const moduleLessons = getLessonsByModule(module.id);
                  return (
                    <div key={module.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          defaultValue={module.title}
                          className="font-medium"
                          onBlur={(e) => {
                            if (e.target.value !== module.title) {
                              handleUpdateModuleTitle(module.id, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                        <Badge variant="secondary">{moduleLessons.length} aulas</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteModule(module.id)}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {moduleLessons.length > 0 && (
                        <div className="pl-4 space-y-1">
                          {moduleLessons.map(lesson => (
                            <div key={lesson.id} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="truncate">• {lesson.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lesson assignments */}
            {modules.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Atribuir aulas aos módulos</h3>
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 truncate">{lesson.title}</span>
                      <Select
                        value={lesson.module_id || '__none__'}
                        onValueChange={(value) =>
                          handleAssignLesson(lesson.id, value === '__none__' ? null : value)
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Sem módulo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem módulo</SelectItem>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
