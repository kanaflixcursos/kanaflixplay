import React, { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delete } from 'react-iconly';
import type { OrganizerModule } from './CourseLessonsOrganizer';

interface ModuleHeaderProps {
  module: OrganizerModule;
  lessonCount: number;
  isEditing: boolean;
  editingTitle: string;
  onStartEdit: () => void;
  onSaveTitle: () => void;
  onCancelEdit: () => void;
  onEditingTitleChange: (value: string) => void;
  onToggleOptional: () => void;
  onDelete: () => void;
}

const ModuleHeader = memo(function ModuleHeader({
  module: mod,
  lessonCount,
  isEditing,
  editingTitle,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
  onEditingTitleChange,
  onToggleOptional,
  onDelete,
}: ModuleHeaderProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50">
      {isEditing ? (
        <Input
          value={editingTitle}
          onChange={(e) => onEditingTitleChange(e.target.value)}
          className="h-7 text-sm font-medium flex-1"
          autoFocus
          onBlur={onSaveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveTitle();
            if (e.key === 'Escape') onCancelEdit();
          }}
        />
      ) : (
        <h3
          className="text-sm font-semibold flex-1 cursor-pointer hover:text-primary transition-colors"
          onClick={onStartEdit}
        >
          {mod.title}
        </h3>
      )}

      <Badge
        variant={mod.is_optional ? 'outline' : 'default'}
        className={`text-xs cursor-pointer select-none ${
          mod.is_optional ? 'border-dashed text-muted-foreground' : ''
        }`}
        onClick={onToggleOptional}
      >
        {mod.is_optional ? 'Opcional' : 'Obrigatório'}
      </Badge>

      <Badge variant="secondary" className="text-xs">
        {lessonCount} aulas
      </Badge>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Delete set="light" size={16} />
      </Button>
    </div>
  );
});

export default ModuleHeader;
