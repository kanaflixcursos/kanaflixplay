import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';
import type { LessonMaterial } from '@/services/lessonService';

interface LessonMaterialsProps {
  materials: LessonMaterial[];
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type === 'application/pdf') {
    return <FileText className="h-4 w-4 text-destructive" />;
  }
  return <FileText className="h-4 w-4 text-primary" />;
}

export default function LessonMaterials({ materials }: LessonMaterialsProps) {
  if (materials.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-4">
        <h3 className="card-title-compact flex items-center gap-2">
          <Download className="h-4 w-4" />
          Materiais Complementares
        </h3>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-2">
          {materials.map((material) => (
            <a
              key={material.id}
              href={material.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              {getFileIcon(material.file_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{material.file_name}</p>
                <span className="text-xs text-muted-foreground">{formatFileSize(material.file_size)}</span>
              </div>
              <Download className="h-4 w-4 text-muted-foreground shrink-0" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
