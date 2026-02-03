import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardListCardProps {
  title: string;
  icon: LucideIcon;
  loading?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
  actionLabel?: string;
  actionLink?: string;
}

export function DashboardListCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardListCard({
  title,
  icon: Icon,
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  children,
  actionLabel,
  actionLink,
}: DashboardListCardProps) {
  const hasItems = !loading && children;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-left">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span className="truncate">{title}</span>
        </CardTitle>
        {actionLabel && actionLink && (
          <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm h-8" asChild>
            <Link to={actionLink}>{actionLabel}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="dashboard-card-content">
        {loading ? (
          <DashboardListCardSkeleton />
        ) : hasItems ? (
          <div className="space-y-3">{children}</div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Reusable list item wrapper for consistent styling
export function DashboardListItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}
