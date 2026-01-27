import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Play } from 'lucide-react';

interface PandavideoPlayerWithProgressProps {
  videoUrl: string;
  lessonId: string;
  title?: string;
  className?: string;
  durationMinutes?: number | null;
  onComplete?: () => void;
}

interface PandaVideoEvent {
  message: string;
  currentTime?: number;
  duration?: number;
  [key: string]: any;
}

export default function PandavideoPlayerWithProgress({ 
  videoUrl, 
  lessonId,
  title, 
  className = '',
  durationMinutes,
  onComplete
}: PandavideoPlayerWithProgressProps) {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const hasMarkedCompleteRef = useRef<boolean>(false);
  const totalDurationRef = useRef<number>(0);

  // Get embed URL from video URL
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    
    if (url.includes('/embed/')) {
      return url;
    }
    
    const videoIdMatch = url.match(/v=([a-zA-Z0-9-]+)/);
    if (videoIdMatch) {
      const domainMatch = url.match(/(player-vz-[^.]+\.tv\.pandavideo\.com\.br)/);
      const domain = domainMatch ? domainMatch[1] : 'player-vz-82493b0a-26d.tv.pandavideo.com.br';
      return `https://${domain}/embed/?v=${videoIdMatch[1]}`;
    }
    
    return url;
  };

  const saveProgress = useCallback(async (watchedSeconds: number, completed: boolean) => {
    if (!user || !lessonId) return;

    try {
      await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          watched_seconds: Math.round(watchedSeconds),
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,lesson_id'
        });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [user, lessonId]);

  const handlePlayerMessage = useCallback((event: MessageEvent) => {
    // Verify it's from Pandavideo
    if (!event.origin.includes('pandavideo.com.br')) return;
    
    let data: PandaVideoEvent;
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }

    // Track video duration
    if (data.duration && data.duration > 0) {
      totalDurationRef.current = data.duration;
    }

    // Handle timeupdate events - save progress every 10 seconds
    if (data.message === 'panda_timeupdate' && data.currentTime) {
      const currentTime = data.currentTime;
      
      // Save every 10 seconds
      if (currentTime - lastSaveTimeRef.current >= 10) {
        lastSaveTimeRef.current = currentTime;
        saveProgress(currentTime, false);
      }

      // Check for 90% completion
      const duration = totalDurationRef.current || (durationMinutes ? durationMinutes * 60 : 0);
      if (duration > 0 && !hasMarkedCompleteRef.current) {
        const percentWatched = (currentTime / duration) * 100;
        if (percentWatched >= 90) {
          hasMarkedCompleteRef.current = true;
          saveProgress(currentTime, true);
          onComplete?.();
        }
      }
    }

    // Handle video end
    if (data.message === 'panda_ended') {
      const duration = totalDurationRef.current || (durationMinutes ? durationMinutes * 60 : 0);
      if (!hasMarkedCompleteRef.current) {
        hasMarkedCompleteRef.current = true;
        saveProgress(duration, true);
        onComplete?.();
      }
    }

    // Handle pause - save current progress
    if (data.message === 'panda_pause' && data.currentTime) {
      saveProgress(data.currentTime, false);
    }
  }, [saveProgress, durationMinutes, onComplete]);

  useEffect(() => {
    // Reset completion flag when lesson changes
    hasMarkedCompleteRef.current = false;
    lastSaveTimeRef.current = 0;
    totalDurationRef.current = 0;
  }, [lessonId]);

  useEffect(() => {
    window.addEventListener('message', handlePlayerMessage);
    return () => {
      window.removeEventListener('message', handlePlayerMessage);
    };
  }, [handlePlayerMessage]);

  const embedUrl = getEmbedUrl(videoUrl);

  if (!embedUrl) {
    return (
      <div className={`aspect-video bg-muted flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-center text-muted-foreground">
          <Play className="h-16 w-16 mx-auto mb-2" />
          <p>Vídeo não disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`aspect-video ${className}`}>
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title || 'Video Player'}
        className="w-full h-full rounded-lg"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ border: 'none' }}
      />
    </div>
  );
}
