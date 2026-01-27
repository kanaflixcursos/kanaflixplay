import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  loading?: boolean;
}

export default function StatCard({ title, value, description, icon: Icon, loading = false }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
        <span className="stat-card-label text-xs sm:text-sm truncate pr-2">{title}</span>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="stat-card-value text-xl sm:text-3xl">
          {loading ? '...' : value}
        </div>
        {description && (
          <p className="stat-card-description text-[10px] sm:text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
