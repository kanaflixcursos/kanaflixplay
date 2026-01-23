import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';

interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  order_index: number;
}

interface LessonMaterialUploadProps {
  lessonId: string;
  materials: LessonMaterial[];
  onMaterialsChange: () => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export default function LessonMaterialUpload({
  lessonId,
  materials,
  onMaterialsChange,
}: LessonMaterialUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_FILES - materials.length;
    if (remainingSlots <= 0) {
      toast.error(`Limite de ${MAX_FILES} arquivos por aula atingido`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Tipo de arquivo não permitido: ${file.name}. Use PDF, JPG ou PNG.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo muito grande: ${file.name}. Máximo 15MB.`);
        continue;
      }
    }

    const validFiles = filesToUpload.filter(
      (file) => ALLOWED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE
    );

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      for (const file of validFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${lessonId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('lesson-materials')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}`);
          console.error(uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('lesson-materials')
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('lesson_materials')
          .insert({
            lesson_id: lessonId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            order_index: materials.length,
          });

        if (insertError) {
          toast.error(`Erro ao salvar ${file.name}`);
          console.error(insertError);
        }
      }

      toast.success('Materiais enviados com sucesso!');
      onMaterialsChange();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar materiais');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (material: LessonMaterial) => {
    setDeletingId(material.id);

    try {
      // Extract file path from URL
      const urlParts = material.file_url.split('/lesson-materials/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('lesson-materials').remove([filePath]);
      }

      const { error } = await supabase
        .from('lesson_materials')
        .delete()
        .eq('id', material.id);

      if (error) throw error;

      toast.success('Material removido');
      onMaterialsChange();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover material');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <Image className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Materiais Complementares ({materials.length}/{MAX_FILES})
        </span>
        {materials.length < MAX_FILES && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Adicionar
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        onChange={handleUpload}
        className="hidden"
      />

      {materials.length > 0 && (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
            >
              {getFileIcon(material.file_type)}
              <div className="flex-1 min-w-0">
                <a
                  href={material.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {material.file_name}
                </a>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(material.file_size)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDelete(material)}
                disabled={deletingId === material.id}
              >
                {deletingId === material.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        PDF, JPG ou PNG • Máximo 15MB por arquivo
      </p>
    </div>
  );
}
