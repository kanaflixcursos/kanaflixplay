import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Folder, Loader2, Check } from 'lucide-react';

interface PandaFolder {
  id: string;
  name: string;
  videos_count?: number;
}

interface PandavideoFolderSelectorProps {
  onSelect: (folder: { id: string; name: string }) => void;
  selectedFolderId?: string;
  trigger?: React.ReactNode;
}

export default function PandavideoFolderSelector({ 
  onSelect, 
  selectedFolderId,
  trigger 
}: PandavideoFolderSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<PandaFolder[]>([]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Você precisa estar autenticado');
        return;
      }

      const response = await fetch(
        `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/pandavideo?action=folders`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao buscar pastas');
      }

      const data = await response.json();
      setFolders(data.folders || data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Erro ao carregar pastas do Pandavideo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchFolders();
    }
  }, [open]);

  const handleSelect = (folder: PandaFolder) => {
    onSelect({ id: folder.id, name: folder.name });
    setOpen(false);
    toast.success(`Pasta "${folder.name}" selecionada`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" type="button">
            <Folder className="mr-2 h-4 w-4" />
            Selecionar Pasta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Pasta do Pandavideo</DialogTitle>
          <DialogDescription>
            Escolha a pasta que contém as aulas do curso
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : folders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma pasta encontrada</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleSelect(folder)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedFolderId === folder.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium">{folder.name}</p>
                      {folder.videos_count !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {folder.videos_count} vídeo(s)
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedFolderId === folder.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
