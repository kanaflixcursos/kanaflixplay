import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useDesign } from '@/contexts/DesignContext';
import logoKanaflixLight from '@/assets/logo-kanaflix.png';
import logoKanaflixDark from '@/assets/logo-kanaflix-white.png';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-8 w-auto' }: LogoProps) {
  const { theme } = useTheme();
  const { settings } = useDesign();
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const isDarkMode = theme === 'dark';

  // Determine which logo to show: custom or default
  const customLogo = isDarkMode ? settings.logoDarkUrl : settings.logoLightUrl;
  const defaultLogo = isDarkMode ? logoKanaflixDark : logoKanaflixLight;
  const currentLogo = customLogo || defaultLogo;

  // Preload both default images on mount
  useEffect(() => {
    const lightImg = new Image();
    const darkImg = new Image();
    
    let loadedCount = 0;
    const onLoad = () => {
      loadedCount++;
      if (loadedCount === 2) setImagesLoaded(true);
    };

    lightImg.onload = onLoad;
    darkImg.onload = onLoad;
    lightImg.onerror = onLoad;
    darkImg.onerror = onLoad;
    
    lightImg.src = logoKanaflixLight;
    darkImg.src = logoKanaflixDark;

    if (lightImg.complete && darkImg.complete) setImagesLoaded(true);
  }, []);

  return (
    <img 
      src={currentLogo} 
      alt="Kanaflix" 
      className={`${className} transition-opacity duration-150 ${imagesLoaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
