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
  { icon: 'text-primary/80', bg: 'bg-primary/8' },
  { icon: 'text-primary/70', bg: 'bg-primary/6' },
  { icon: 'text-primary/90', bg: 'bg-primary/12' },
  { icon: 'text-primary/75', bg: 'bg-primary/7' },
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
      className="h-full"
    >
      <Card className="overflow-hidden h-full">
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("p-2 rounded-xl shrink-0", finalBgColor)}>
              <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", finalIconColor)} />
            </div>
            <span className="stat-card-label leading-tight">{title}</span>
          </div>
          {loading ? (
            <Skeleton className="h-7 sm:h-9 w-20" />
          ) : (
            <>
              <div className="stat-card-value truncate">{value}</div>
              {description && (
                <p className="stat-card-description text-xs mt-0.5">{description}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}