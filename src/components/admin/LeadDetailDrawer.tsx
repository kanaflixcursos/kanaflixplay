import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Calendar, Tag, Globe, Megaphone, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { leadStatusMap } from '@/lib/lead-constants';
import LeadOriginBadge from './LeadOriginBadge';
import { useState } from 'react';

interface Lead {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  source: string;
  status: string;
  tags: string[];
  created_at: string;
  form_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (leadId: string, status: string) => void;
  onAddTag: (leadId: string, tag: string) => void;
  onRemoveTag: (leadId: string, tag: string) => void;
}

export default function LeadDetailDrawer({ lead, open, onOpenChange, onStatusChange, onAddTag, onRemoveTag }: LeadDetailDrawerProps) {
  const [newTag, setNewTag] = useState('');

  if (!lead) return null;

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    onAddTag(lead.id, newTag.trim().toLowerCase());
    setNewTag('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">{lead.name || 'Lead sem nome'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{lead.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</h3>
            <Select value={lead.status} onValueChange={(v) => onStatusChange(lead.id, v)}>
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leadStatusMap).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Origin & UTM */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Origem & Atribuição</h3>
            <LeadOriginBadge
              source={lead.source}
              utmSource={lead.utm_source}
              utmMedium={lead.utm_medium}
              utmCampaign={lead.utm_campaign}
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Fonte (source)</span>
                <p className="font-medium">{lead.source || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">utm_source</span>
                <p className="font-medium">{lead.utm_source || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">utm_medium</span>
                <p className="font-medium">{lead.utm_medium || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">utm_campaign</span>
                <p className="font-medium">{lead.utm_campaign || '—'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {(lead.tags || []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma tag</p>
              )}
              {(lead.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                  {tag}
                  <button onClick={() => onRemoveTag(lead.id, tag)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button size="sm" className="h-8" onClick={handleAddTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
