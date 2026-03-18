import { useTheme } from '@/components/ThemeProvider';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import logoKanaflixLight from '@/assets/logo-kanaflix.png';
import logoKanaflixDark from '@/assets/logo-kanaflix-white.png';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-8 w-auto' }: LogoProps) {
  const { theme } = useTheme();
  const { data: settings } = useSiteSettings();
  const isDarkMode = theme === 'dark';

  // If a custom logo is set, use it (single logo for both modes)
  if (settings?.logo_url) {
    return (
      <img
        src={settings.logo_url}
        alt={settings.platform_name || 'Logo'}
        className={className}
      />
    );
  }

  return (
    <div className="relative inline-flex">
      <img
        src={logoKanaflixLight}
        alt="Kanaflix"
        className={`${className} transition-opacity duration-150 ${isDarkMode ? 'opacity-0 absolute inset-0' : 'opacity-100'}`}
      />
      <img
        src={logoKanaflixDark}
        alt="Kanaflix"
        className={`${className} transition-opacity duration-150 ${isDarkMode ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
      />
    </div>
  );
}
