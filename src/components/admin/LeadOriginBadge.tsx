import { Badge } from '@/components/ui/badge';
import { Globe, FileText, UserPlus, Megaphone, Instagram, Facebook, Mail } from 'lucide-react';

const channelConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; className: string }> = {
  google: { icon: Globe, label: 'Google', className: 'bg-chart-1/15 text-chart-1 border-chart-1/30' },
  instagram: { icon: Instagram, label: 'Instagram', className: 'bg-chart-5/15 text-chart-5 border-chart-5/30' },
  facebook: { icon: Facebook, label: 'Facebook', className: 'bg-chart-2/15 text-chart-2 border-chart-2/30' },
  email: { icon: Mail, label: 'E-mail', className: 'bg-chart-3/15 text-chart-3 border-chart-3/30' },
  newsletter: { icon: Mail, label: 'Newsletter', className: 'bg-chart-3/15 text-chart-3 border-chart-3/30' },
};

const sourceLabels: Record<string, string> = {
  signup: 'Cadastro',
  form: 'Formulário',
};

interface LeadOriginBadgeProps {
  source: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export default function LeadOriginBadge({ source, utmSource, utmMedium, utmCampaign }: LeadOriginBadgeProps) {
  // Determine primary channel from utm_source or source
  const channel = utmSource?.toLowerCase() || '';
  const config = channelConfig[channel];

  const Icon = config?.icon || (source === 'signup' ? UserPlus : source === 'form' ? FileText : Megaphone);
  const label = config?.label || utmSource || sourceLabels[source] || source;
  const badgeClass = config?.className || 'bg-muted text-muted-foreground border-muted-foreground/20';

  const hasUtmDetails = utmMedium || utmCampaign;

  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant="outline" className={`text-xs px-2 py-0.5 gap-1 w-fit ${badgeClass}`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
      {hasUtmDetails && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-0.5">
          {utmMedium && <span>{utmMedium}</span>}
          {utmMedium && utmCampaign && <span>·</span>}
          {utmCampaign && <span className="truncate max-w-[120px]">{utmCampaign}</span>}
        </div>
      )}
    </div>
  );
}
