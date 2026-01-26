import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Video, Search, Loader2, Check, Clock } from 'lucide-react';

interface PandaVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  status: string;
  duration?: number;
  player_url?: string;
}

interface PandavideoSelectorProps {
  onSelect: (video: { id: string; title: string; embedUrl: string; duration: number }) => void;
  trigger?: React.ReactNode;
}

export default function PandavideoSelector({ onSelect, trigger }: PandavideoSelectorProps) {
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<PandaVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const fetchVideos = async (searchTerm?: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado');
        return;
      }

      let url = `https://fwytxapogblcesvyxrzt.supabase.co/functions/v1/pandavideo?action=list`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar vídeos');
      }

      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Erro ao carregar vídeos do Pandavideo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchVideos();
    }
  }, [open]);

  const handleSearch = () => {
    fetchVideos(search);
  };

  const handleSelect = (video: PandaVideo) => {
    setSelectedVideo(video.id);
    
    // Extract embed URL from player_url or construct it
    const embedUrl = video.player_url || `https://player-vz-82493b0a-26d.tv.pandavideo.com.br/embed/?v=${video.id}`;
    
    onSelect({
      id: video.id,
      title: video.title,
      embedUrl,
      duration: video.duration ? Math.ceil(video.duration / 60) : 0,
    });
    
    setOpen(false);
    toast.success(`Vídeo "${video.title}" selecionado`);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" type="button">
            <Video className="mr-2 h-4 w-4" />
            Selecionar Vídeo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Vídeo do Pandavideo</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Buscar vídeos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum vídeo encontrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent ${
                    selectedVideo === video.id ? 'ring-2 ring-primary bg-accent' : ''
                  }`}
                  onClick={() => handleSelect(video)}
                >
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-24 h-14 object-cover rounded"
                    />
                  ) : (
                    <div className="w-24 h-14 bg-muted flex items-center justify-center rounded">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{video.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(video.duration)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        video.status === 'CONVERTING' 
                          ? 'bg-warning/10 text-warning-foreground'
                          : 'bg-success/10 text-success'
                      }`}>
                        {video.status === 'CONVERTING' ? 'Processando' : 'Pronto'}
                      </span>
                    </div>
                  </div>
                  
                  {selectedVideo === video.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
