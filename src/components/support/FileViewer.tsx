import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

export interface AttachmentFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface FileViewerProps {
  files: AttachmentFile[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('video/')) return Video;
  if (type === 'application/pdf') return FileText;
  return File;
};

export function FileViewer({ files, initialIndex = 0, open, onOpenChange }: FileViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentFile = files[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentFile.url;
    link.download = currentFile.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (!currentFile) return null;

    const { type, url, name } = currentFile;

    if (type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <img 
            src={url} 
            alt={name} 
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>
      );
    }

    if (type.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <video 
            src={url} 
            controls 
            className="max-w-full max-h-[70vh] rounded-lg"
          >
            Seu navegador não suporta a reprodução de vídeo.
          </video>
        </div>
      );
    }

    if (type === 'application/pdf') {
      return (
        <div className="h-[70vh] w-full">
          <iframe
            src={url}
            title={name}
            className="w-full h-full rounded-lg border-0"
          />
        </div>
      );
    }

    // Fallback for unsupported types
    const FileIcon = getFileIcon(type);
    return (
      <div className="flex flex-col items-center justify-center h-[300px] gap-4">
        <FileIcon className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{formatFileSize(currentFile.size)}</p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Baixar Arquivo
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="truncate pr-4 text-sm font-medium">
            {currentFile?.name}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {files.length}
            </span>
            <Button variant="ghost" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative p-4 min-h-[300px]">
          {/* Navigation buttons */}
          {files.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
                onClick={goToNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {renderContent()}
        </div>

        {/* Thumbnail strip */}
        {files.length > 1 && (
          <div className="p-4 border-t flex gap-2 overflow-x-auto">
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.type);
              const isActive = index === currentIndex;
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                    isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  {file.type.startsWith('image/') ? (
                    <img 
                      src={file.url} 
                      alt={file.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Compact file preview component for chat messages
interface FilePreviewProps {
  files: AttachmentFile[];
  onViewFile: (index: number) => void;
}

export function FilePreview({ files, onViewFile }: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {files.map((file, index) => {
        const FileIcon = getFileIcon(file.type);
        const isImage = file.type.startsWith('image/');
        
        return (
          <button
            key={index}
            onClick={() => onViewFile(index)}
            className="relative group rounded-lg border overflow-hidden hover:border-primary transition-colors"
          >
            {isImage ? (
              <div className="w-20 h-20">
                <img 
                  src={file.url} 
                  alt={file.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <div className="w-32 h-16 flex items-center gap-2 px-3 bg-muted">
                <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
