import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import logoKanaflixLight from '@/assets/logo-kanaflix.png';
import logoKanaflixDark from '@/assets/logo-kanaflix-white.png';

interface SidebarLogoProps {
  showAdminBadge?: boolean;
}

export default function SidebarLogo({ showAdminBadge = false }: SidebarLogoProps) {
  const { theme } = useTheme();
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload both images on mount
  useEffect(() => {
    const lightImg = new Image();
    const darkImg = new Image();
    
    let loadedCount = 0;
    const onLoad = () => {
      loadedCount++;
      if (loadedCount === 2) {
        setImagesLoaded(true);
      }
    };

    lightImg.onload = onLoad;
    darkImg.onload = onLoad;
    
    lightImg.src = logoKanaflixLight;
    darkImg.src = logoKanaflixDark;
  }, []);

  const isDarkMode = theme === 'dark';
  const currentLogo = isDarkMode ? logoKanaflixDark : logoKanaflixLight;

  return (
    <div className="p-4 border-b">
      <div className="flex items-center gap-3">
        <img 
          src={currentLogo} 
          alt="Kanaflix" 
          className={`h-8 w-auto transition-opacity duration-200 ${imagesLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        {showAdminBadge && (
          <span className="text-xs text-muted-foreground font-medium">Admin</span>
        )}
      </div>
    </div>
  );
}
