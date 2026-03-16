import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import logoKanaflixLight from '@/assets/logo-kanaflix.png';
import logoKanaflixDark from '@/assets/logo-kanaflix-white.png';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-8 w-auto' }: LogoProps) {
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
    
    // Handle already cached images
    lightImg.onerror = onLoad;
    darkImg.onerror = onLoad;
    
    lightImg.src = logoKanaflixLight;
    darkImg.src = logoKanaflixDark;

    // Set loaded if images are already cached
    if (lightImg.complete && darkImg.complete) {
      setImagesLoaded(true);
    }
  }, []);

  const isDarkMode = theme === 'dark';
  const currentLogo = isDarkMode ? logoKanaflixDark : logoKanaflixLight;

  return (
    <img 
      src={currentLogo} 
      alt="Kanaflix" 
      className={`${className} transition-opacity duration-150 ${imagesLoaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
