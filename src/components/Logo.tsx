import { useTheme } from '@/components/ThemeProvider';
import logoKanaflixLight from '@/assets/logo-kanaflix.png';
import logoKanaflixDark from '@/assets/logo-kanaflix-white.png';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-8 w-auto' }: LogoProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className="relative inline-flex">
      {/* Light mode logo — always in DOM, hidden in dark mode */}
      <img
        src={logoKanaflixLight}
        alt="Kanaflix"
        className={`${className} transition-opacity duration-150 ${isDarkMode ? 'opacity-0 absolute inset-0' : 'opacity-100'}`}
      />
      {/* Dark mode logo — always in DOM, hidden in light mode */}
      <img
        src={logoKanaflixDark}
        alt="Kanaflix"
        className={`${className} transition-opacity duration-150 ${isDarkMode ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
      />
    </div>
  );
}
