import { Badge } from '@/components/ui/badge';
import { Globe, FileText, UserPlus, Megaphone, Instagram, Facebook, Mail, MousePointer } from 'lucide-react';

const channelConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; className: string }> = {
  google: { icon: Globe, label: 'Google Ads', className: 'bg-primary/15 text-primary border-primary/30' },
  instagram: { icon: Instagram, label: 'Instagram', className: 'bg-primary/15 text-primary border-primary/30' },
  facebook: { icon: Facebook, label: 'Facebook Ads', className: 'bg-primary/15 text-primary border-primary/30' },
  email: { icon: Mail, label: 'E-mail', className: 'bg-primary/15 text-primary border-primary/30' },
  newsletter: { icon: Mail, label: 'Newsletter', className: 'bg-primary/15 text-primary border-primary/30' },
  direto: { icon: MousePointer, label: 'Direto', className: 'bg-muted text-muted-foreground border-muted-foreground/20' },
};

/** Returns a human-readable traffic origin label */
export function resolveOriginLabel(utmSource: string | null): string {
  if (!utmSource) return 'Direto';
  const key = utmSource.toLowerCase();
  return channelConfig[key]?.label || utmSource;
}

interface LeadOriginBadgeProps {
  utmSource: string | null;
}

export default function LeadOriginBadge({ utmSource }: LeadOriginBadgeProps) {
  const channel = (utmSource || 'direto').toLowerCase();
  const config = channelConfig[channel] || channelConfig.direto;
  const Icon = config?.icon || Megaphone;
  const label = config?.label || utmSource || 'Direto';
  const badgeClass = config?.className || 'bg-muted text-muted-foreground border-muted-foreground/20';

  return (
    <Badge variant="outline" className={`text-xs px-2 py-0.5 gap-1 w-fit ${badgeClass}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
