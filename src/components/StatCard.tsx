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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="stat-card-label">{title}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="stat-card-value">
          {loading ? '...' : value}
        </div>
        {description && (
          <p className="stat-card-description">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
