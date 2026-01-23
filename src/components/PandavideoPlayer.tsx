import { Play } from 'lucide-react';

interface PandavideoPlayerProps {
  videoUrl: string;
  title?: string;
  className?: string;
}

export default function PandavideoPlayer({ videoUrl, title, className = '' }: PandavideoPlayerProps) {
  // Check if it's a Pandavideo URL and ensure it's the embed version
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // If it's already an embed URL, return as is
    if (url.includes('/embed/')) {
      return url;
    }
    
    // Try to extract video ID and construct embed URL
    const videoIdMatch = url.match(/v=([a-zA-Z0-9-]+)/);
    if (videoIdMatch) {
      // Extract the player domain from the URL or use a default pattern
      const domainMatch = url.match(/(player-vz-[^.]+\.tv\.pandavideo\.com\.br)/);
      const domain = domainMatch ? domainMatch[1] : 'player-vz-82493b0a-26d.tv.pandavideo.com.br';
      return `https://${domain}/embed/?v=${videoIdMatch[1]}`;
    }
    
    // Return original URL if it doesn't match expected patterns
    return url;
  };

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
