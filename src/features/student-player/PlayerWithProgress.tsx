import { useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePandavideoProgress } from '@/hooks/usePandavideoProgress';
import { Play, Lock } from 'lucide-react';

interface PlayerWithProgressProps {
  videoUrl: string;
  lessonId: string;
  title?: string;
  className?: string;
  durationMinutes?: number | null;
  onComplete?: () => void;
  isLocked?: boolean;
  lockTitle?: string;
  lockMessage?: string;
}

/** Validate Pandavideo domain */
function isValidPandavideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return /^player-vz-[a-z0-9-]+\.tv\.pandavideo\.com\.br$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

/** Resolve embed URL from any Pandavideo URL variant */
function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes('/embed/') && isValidPandavideoUrl(url)) return url;

  const videoIdMatch = url.match(/v=([a-zA-Z0-9-]+)/);
  if (videoIdMatch) {
    const domainMatch = url.match(/(player-vz-[^.]+\.tv\.pandavideo\.com\.br)/);
    const domain = domainMatch ? domainMatch[1] : 'player-vz-82493b0a-26d.tv.pandavideo.com.br';
    const constructed = `https://${domain}/embed/?v=${videoIdMatch[1]}`;
    return isValidPandavideoUrl(constructed) ? constructed : null;
  }
  return null;
}

export default function PlayerWithProgress({
  videoUrl,
  lessonId,
  title,
  className = '',
  durationMinutes,
  onComplete,
  isLocked = false,
  lockTitle,
  lockMessage,
}: PlayerWithProgressProps) {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // All iframe message handling + DB persistence lives in the hook
  usePandavideoProgress({
    userId: user?.id,
    lessonId,
    durationMinutes,
    onComplete,
  });

  if (isLocked) {
    return (
      <div className={`aspect-video bg-foreground/90 flex flex-col items-center justify-center rounded-lg ${className}`}>
        <div className="text-center text-background">
          <Lock className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-medium">{lockTitle || 'Aula Bloqueada'}</p>
          <p className="text-sm opacity-80 mt-2">
            {lockMessage || 'Complete a aula anterior para desbloquear'}
          </p>
        </div>
      </div>
    );
  }

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
