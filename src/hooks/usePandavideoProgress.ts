import { useEffect, useRef, useCallback } from 'react';
import { saveLessonProgress } from '@/services/lessonService';

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

interface UsePandavideoProgressOptions {
  userId: string | undefined;
  lessonId: string;
  durationMinutes?: number | null;
  onComplete?: () => void;
}

/**
 * Hook that listens to Pandavideo iframe postMessage events,
 * saves watch progress to the database every 10s,
 * and triggers completion at 90% watched or video end.
 */
export function usePandavideoProgress({
  userId,
  lessonId,
  durationMinutes,
  onComplete,
}: UsePandavideoProgressOptions) {
  const lastSaveTimeRef = useRef<number>(0);
  const hasMarkedCompleteRef = useRef<boolean>(false);
  const totalDurationRef = useRef<number>(0);

  // Reset on lesson change
  useEffect(() => {
    hasMarkedCompleteRef.current = false;
    lastSaveTimeRef.current = 0;
    totalDurationRef.current = 0;
  }, [lessonId]);

  const saveProgress = useCallback(
    async (watchedSeconds: number, completed: boolean) => {
      if (!userId || !lessonId) return;
      try {
        await saveLessonProgress(userId, lessonId, watchedSeconds, completed);
      } catch {
        // silently fail — non-critical
      }
    },
    [userId, lessonId]
  );

  const handlePlayerMessage = useCallback(
    (event: MessageEvent) => {
      if (!event.origin.includes('pandavideo.com.br')) return;

      let data: PandaVideoEvent;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      // Track duration
      if (data.duration && data.duration > 0 && totalDurationRef.current === 0) {
        totalDurationRef.current = data.duration;
      }
      if (data.message === 'panda_allData' && data.playerData?.duration && data.playerData.duration > 0) {
        if (totalDurationRef.current === 0) {
          totalDurationRef.current = data.playerData.duration;
        }
      }

      // Timeupdate — save every 10s, check 90% completion
      if (data.message === 'panda_timeupdate' && data.currentTime !== undefined) {
        const currentTime = data.currentTime;

        if (currentTime - lastSaveTimeRef.current >= 10) {
          lastSaveTimeRef.current = currentTime;
          saveProgress(currentTime, false);
        }

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

      // Video ended
      if (data.message === 'panda_ended') {
        const duration = totalDurationRef.current || (durationMinutes ? durationMinutes * 60 : 0);
        if (!hasMarkedCompleteRef.current) {
          hasMarkedCompleteRef.current = true;
          saveProgress(duration, true);
          onComplete?.();
        }
      }

      // Pause — save current position
      if (data.message === 'panda_pause' && data.currentTime !== undefined) {
        saveProgress(data.currentTime, false);
      }
    },
    [saveProgress, durationMinutes, onComplete]
  );

  useEffect(() => {
    window.addEventListener('message', handlePlayerMessage);
    return () => window.removeEventListener('message', handlePlayerMessage);
  }, [handlePlayerMessage]);
}
