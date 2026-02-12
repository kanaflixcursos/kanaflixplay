import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { LogOut, Moon } from 'lucide-react';

interface SidebarProfileBoxProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  onSignOut: () => void;
}

export default function SidebarProfileBox({
  userName,
  userEmail,
  avatarUrl,
  onSignOut,
}: SidebarProfileBoxProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const isDarkMode = theme === 'dark';
  
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* User Profile */}
      <button
        onClick={() => navigate('/profile')}
        className="sidebar-profile-btn"
      >
        <Avatar className="sidebar-profile-avatar">
          <AvatarImage src={avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="sidebar-profile-name">{userName}</p>
          <p className="sidebar-profile-email">{userEmail}</p>
        </div>
      </button>

      <Separator className="my-2" />

      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4" />
          <span className="text-sm font-normal">Modo Escuro</span>
        </div>
        <Switch
          checked={isDarkMode}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        />
      </div>

      <Separator className="my-2" />

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 h-9 px-3 font-normal text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onSignOut}
      >
        <LogOut className="h-4 w-4" />
        Sair da Conta
      </Button>
    </>
  );
}
