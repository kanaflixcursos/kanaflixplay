import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUp, ArrowDown, ArrowRightLeft } from 'lucide-react';
import { Play as PlayIcon, Show, Hide, Paper, ChevronDown, ChevronUp } from 'react-iconly';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LessonMaterialUpload from '@/components/LessonMaterialUpload';
import type { OrganizerLesson, OrganizerModule } from './CourseLessonsOrganizer';

interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  order_index: number;
}

interface LessonItemProps {
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
}

const LessonItem = memo(function LessonItem({
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
}: LessonItemProps) {
  const canMoveUp = index > 0;
  const canMoveDown = index < totalInModule - 1;
  const otherModules = modules.filter(m => m.id !== currentModuleId);

  return (
    <Card className={lesson.is_hidden ? 'opacity-60' : ''}>
      <Collapsible open={isExpanded && showMaterials} onOpenChange={onToggleExpand}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={!canMoveUp}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={!canMoveDown}>
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
});

export default LessonItem;
