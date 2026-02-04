import Logo from '@/components/Logo';

interface SidebarLogoProps {
  showAdminBadge?: boolean;
}

export default function SidebarLogo({ showAdminBadge = false }: SidebarLogoProps) {
  return (
    <div className="p-4 border-b">
      <div className="flex items-center gap-3">
        <Logo className="h-8 w-auto" />
        {showAdminBadge && (
          <span className="text-xs text-muted-foreground font-medium">Admin</span>
        )}
      </div>
    </div>
  );
}
