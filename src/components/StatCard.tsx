import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useId } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  loading?: boolean;
  iconColor?: string;
  iconBgColor?: string;
}

const colorPalette = [
  { icon: 'text-primary', bg: 'bg-primary/10' },
  { icon: 'text-chart-3', bg: 'bg-chart-3/10' },
  { icon: 'text-chart-2', bg: 'bg-chart-2/10' },
  { icon: 'text-chart-4', bg: 'bg-chart-4/10' },
  { icon: 'text-chart-5', bg: 'bg-chart-5/10' },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function StatCard({ title, value, description, icon: Icon, loading = false, iconColor, iconBgColor }: StatCardProps) {
  const id = useId();
  const colors = colorPalette[hashString(id) % colorPalette.length];

  const finalIconColor = iconColor || colors.icon;
  const finalBgColor = iconBgColor || colors.bg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("p-2 rounded-xl shrink-0", finalBgColor)}>
              <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", finalIconColor)} />
            </div>
            <span className="stat-card-label text-xs sm:text-sm truncate">{title}</span>
          </div>
          {loading ? (
            <Skeleton className="h-7 sm:h-9 w-20" />
          ) : (
            <>
              <div className="stat-card-value text-xl sm:text-3xl truncate">{value}</div>
              {description && (
                <p className="stat-card-description text-[10px] sm:text-xs mt-0.5">{description}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}