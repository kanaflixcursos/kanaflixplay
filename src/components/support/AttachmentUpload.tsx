import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Paperclip, X, Loader2, File, Image as ImageIcon, Video, FileText } from 'lucide-react';
import type { AttachmentFile } from './FileViewer';

interface AttachmentUploadProps {
  userId: string;
  ticketId: string;
  attachments: AttachmentFile[];
  onAttachmentsChange: (attachments: AttachmentFile[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('video/')) return Video;
  if (type === 'application/pdf') return FileText;
  return File;
};

export function AttachmentUpload({
  userId,
  ticketId,
  attachments,
  onAttachmentsChange,
  disabled = false,
}: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check max files limit
    const totalFiles = attachments.length + files.length;
    if (totalFiles > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} arquivos por mensagem`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Validate file sizes
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede o limite de 10MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);

    const newAttachments: AttachmentFile[] = [];

    for (const file of validFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${ticketId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erro ao enviar "${file.name}"`);
          continue;
        }

        // Get signed URL (private bucket)
        const { data: urlData } = await supabase.storage
          .from('support-attachments')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

        if (urlData?.signedUrl) {
          newAttachments.push({
            name: file.name,
            url: urlData.signedUrl,
            type: file.type,
            size: file.size,
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Erro ao enviar "${file.name}"`);
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
      toast.success(`${newAttachments.length} arquivo(s) anexado(s)`);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || disabled}
      />

      {/* Attachment button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || disabled || attachments.length >= MAX_FILES}
        className="h-9 w-9"
        title="Anexar arquivo (máx. 10MB, 5 arquivos)"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>

      {/* Attached files preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
          {attachments.map((file, index) => {
            const FileIcon = getFileIcon(file.type);
            const isImage = file.type.startsWith('image/');
            
            return (
              <div
                key={index}
                className="relative group flex items-center gap-2 px-2 py-1 bg-background border rounded-md"
              >
                {isImage ? (
                  <img 
                    src={file.url} 
                    alt={file.name} 
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="min-w-0 max-w-[120px]">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(index)}
                  className="p-0.5 hover:bg-destructive/10 rounded transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })}
          
          <span className="text-xs text-muted-foreground self-center px-2">
            {attachments.length}/{MAX_FILES}
          </span>
        </div>
      )}
    </div>
  );
}
