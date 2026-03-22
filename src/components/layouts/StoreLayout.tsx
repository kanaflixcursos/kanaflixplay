import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCreator } from '@/contexts/CreatorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StoreLayout({ children }: { children: ReactNode }) {
  const { creator, settings, loading, creatorId } = useCreator();
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Loja não encontrada</h1>
        <p className="text-muted-foreground text-sm">Esta loja não existe ou está desativada.</p>
        <Link to="/" className="text-primary underline text-sm">Voltar ao início</Link>
      </div>
    );
  }

  const logoUrl = settings?.logo_url || creator.logo_url;
  const storeName = settings?.platform_name || creator.name;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Store Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={`/store/${creator.slug}`} className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-8 max-w-[120px] object-contain" />
            ) : (
              <span className="text-lg font-bold">{storeName}</span>
            )}
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to={`/admin/creators/${creatorId}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </Button>
              </Link>
            )}
            {user ? (
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Meu painel
              </Link>
            ) : (
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Store Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Store Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>{storeName} — Powered by Kanaflix</p>
      </footer>
    </div>
  );
}
