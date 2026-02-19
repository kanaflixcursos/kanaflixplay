import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Play, Lock } from 'lucide-react';

interface PandavideoPlayerWithProgressProps {
  videoUrl: string;
  lessonId: string;
  title?: string;
  className?: string;
  durationMinutes?: number | null;
  onComplete?: () => void;
  isLocked?: boolean;
}

interface PandaVideoEvent {
  message: string;
  currentTime?: number;
  duration?: number;
  playerData?: {
    duration?: number;
    currentTime?: number;
  };
  [key: string]: any;
}

export default function PandavideoPlayerWithProgress({ 
  videoUrl, 
  lessonId,
  title, 
  className = '',
  durationMinutes,
  onComplete,
  isLocked = false
}: PandavideoPlayerWithProgressProps) {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const hasMarkedCompleteRef = useRef<boolean>(false);
  const totalDurationRef = useRef<number>(0);

  // Validate that a URL belongs to an allowed Pandavideo domain
  const isValidPandavideoUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;
      return /^player-vz-[a-z0-9-]+\.tv\.pandavideo\.com\.br$/.test(parsed.hostname);
    } catch {
      return false;
    }
  };

  // Get embed URL from video URL with domain validation
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    
    if (url.includes('/embed/') && isValidPandavideoUrl(url)) {
      return url;
    }
    
    const videoIdMatch = url.match(/v=([a-zA-Z0-9-]+)/);
    if (videoIdMatch) {
      const domainMatch = url.match(/(player-vz-[^.]+\.tv\.pandavideo\.com\.br)/);
      const domain = domainMatch ? domainMatch[1] : 'player-vz-82493b0a-26d.tv.pandavideo.com.br';
      const constructedUrl = `https://${domain}/embed/?v=${videoIdMatch[1]}`;
      if (isValidPandavideoUrl(constructedUrl)) {
        return constructedUrl;
      }
      return null;
    }
    
    // Reject any URL that doesn't match Pandavideo patterns
    return null;
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
          updated_at: new Date().toISOString(),
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

    // Track video duration from multiple possible sources
    // Priority 1: Direct duration field
    if (data.duration && data.duration > 0 && totalDurationRef.current === 0) {
      totalDurationRef.current = data.duration;
    }
    
    // Priority 2: panda_allData event with playerData.duration
    if (data.message === 'panda_allData' && data.playerData?.duration && data.playerData.duration > 0) {
      if (totalDurationRef.current === 0) {
        totalDurationRef.current = data.playerData.duration;
        console.log('[Pandavideo] Duration set from panda_allData:', data.playerData.duration);
      }
    }

    // Handle timeupdate events - save progress every 10 seconds
    if (data.message === 'panda_timeupdate' && data.currentTime !== undefined) {
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
          console.log('[Pandavideo] 90% reached! Marking as complete.');
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
    if (data.message === 'panda_pause' && data.currentTime !== undefined) {
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

  // Show locked state
  if (isLocked) {
    return (
      <div className={`aspect-video bg-foreground/90 flex flex-col items-center justify-center rounded-lg ${className}`}>
        <div className="text-center text-background">
          <Lock className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-medium">Aula Bloqueada</p>
          <p className="text-sm opacity-80 mt-2">
            Complete a aula anterior para desbloquear
          </p>
        </div>
      </div>
    );
  }

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
    <div className={`aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title || 'Video Player'}
        className="w-full h-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ border: 'none' }}
      />
    </div>
  );
}