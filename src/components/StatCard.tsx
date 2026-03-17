import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  loading?: boolean;
}

export default function StatCard({ title, value, description, icon: Icon, loading = false }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="h-full"
    >
      <Card className="overflow-hidden h-full relative">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-primary/20 blur-xl pointer-events-none" />
        <CardContent className="p-3 sm:p-5 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box">
              <Icon />
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