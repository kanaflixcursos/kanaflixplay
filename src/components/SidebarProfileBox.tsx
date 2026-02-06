import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { LogOut, Moon, Bell, GraduationCap, ShoppingBag, HelpCircle } from 'lucide-react';

interface SidebarProfileBoxProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  unreadCount?: number;
  pendingSupportCount?: number;
  onSignOut: () => void;
  variant?: 'student' | 'admin';
}

export default function SidebarProfileBox({
  userName,
  userEmail,
  avatarUrl,
  unreadCount = 0,
  pendingSupportCount = 0,
  onSignOut,
  variant = 'student',
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

      {/* Action Buttons */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-9 px-3 font-normal"
          onClick={() => navigate(variant === 'admin' ? '/admin/courses' : '/')}
        >
          <GraduationCap className="h-4 w-4" />
          Meus Cursos
        </Button>

        {variant === 'student' && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9 px-3 font-normal"
            onClick={() => navigate('/purchases')}
          >
            <ShoppingBag className="h-4 w-4" />
            Minhas Compras
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-9 px-3 font-normal relative"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="h-4 w-4" />
          Notificações
          {unreadCount > 0 && (
            <span className="absolute right-2 h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-9 px-3 font-normal relative"
          onClick={() => navigate(variant === 'admin' ? '/admin/suporte' : '/suporte')}
        >
          <HelpCircle className="h-4 w-4" />
          Suporte
          {variant === 'admin' && pendingSupportCount > 0 && (
            <span className="absolute right-2 h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {pendingSupportCount > 99 ? '99+' : pendingSupportCount}
            </span>
          )}
        </Button>

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
      </div>
    </>
  );
}
