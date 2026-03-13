import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  ShoppingCart,
  CheckCircle,
  XCircle,
  GraduationCap,
  Activity,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JourneyEvent {
  id: string;
  event_type: string;
  page_path: string | null;
  created_at: string;
  visitor_id: string;
  user_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  event_data: Record<string, unknown> | null;
}

const eventConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bg: string }> = {
  signup: { icon: UserPlus, label: 'Cadastro', color: 'text-chart-3', bg: 'bg-chart-3/15' },
  checkout_started: { icon: ShoppingCart, label: 'Checkout iniciado', color: 'text-warning', bg: 'bg-warning/15' },
  checkout_completed: { icon: CheckCircle, label: 'Compra concluída', color: 'text-success', bg: 'bg-success/15' },
  checkout_abandoned: { icon: XCircle, label: 'Checkout abandonado', color: 'text-destructive', bg: 'bg-destructive/15' },
  enrollment: { icon: GraduationCap, label: 'Matrícula', color: 'text-chart-2', bg: 'bg-chart-2/15' },
};

interface CustomerJourneyTimelineProps {
  userId?: string;
  showFilters?: boolean;
  limit?: number;
  title?: string;
  defaultVisible?: number;
}

export default function CustomerJourneyTimeline({
  userId,
  showFilters = false,
  limit = 50,
  title = 'Jornada do Cliente',
  defaultVisible = 15,
}: CustomerJourneyTimelineProps) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('all');
  const [utmFilter, setUtmFilter] = useState('all');
  const [utmSources, setUtmSources] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [userId, eventFilter, utmFilter]);

  useEffect(() => {
    if (showFilters) fetchUtmSources();
  }, [showFilters]);

  const fetchUtmSources = async () => {
    const { data } = await supabase
      .from('user_events')
      .select('utm_source')
      .not('utm_source', 'is', null);
    if (data) {
      const unique = [...new Set(data.map(d => d.utm_source).filter(Boolean))] as string[];
      setUtmSources(unique);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase
      .from('user_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('user_id', userId);
    if (eventFilter !== 'all') query = query.eq('event_type', eventFilter);
    if (utmFilter !== 'all') query = query.eq('utm_source', utmFilter);
    query = query.neq('event_type', 'login').neq('event_type', 'page_view');

    const { data } = await query;
    const rawEvents = (data as JourneyEvent[]) || [];

    // Resolve course_id to course_title where missing
    const courseIds = new Set<string>();
    rawEvents.forEach(e => {
      const ed = e.event_data as Record<string, unknown> | null;
      if (ed?.course_id && !ed.course_title) courseIds.add(String(ed.course_id));
    });

    let coursesMap = new Map<string, string>();
    if (courseIds.size > 0) {
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', [...courseIds]);
      courses?.forEach(c => coursesMap.set(c.id, c.title));
    }

    const enrichedEvents = rawEvents.map(e => {
      const ed = e.event_data as Record<string, unknown> | null;
      if (ed?.course_id && !ed.course_title && coursesMap.has(String(ed.course_id))) {
        return { ...e, event_data: { ...ed, course_title: coursesMap.get(String(ed.course_id)) } };
      }
      return e;
    });

    setEvents(enrichedEvents);
    setLoading(false);
  };

  const formatTime = (dateStr: string) =>
    format(new Date(dateStr), "dd/MM/yy 'às' HH:mm", { locale: ptBR });

  const visibleEvents = showAll ? events : events.slice(0, defaultVisible);
  const hasMore = events.length > defaultVisible;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              {Object.entries(eventConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showFilters && utmSources.length > 0 && (
            <Select value={utmFilter} onValueChange={setUtmFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                {utmSources.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10">
            <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum evento registrado</p>
          </div>
        ) : (
          <>
            <ScrollArea className={showAll && hasMore ? 'h-[480px]' : undefined}>
              <div className="relative">
                <div className="absolute left-[18px] top-3 bottom-3 w-px bg-border" />
                <div className="space-y-1">
                  {visibleEvents.map((event) => {
                    const cfg = eventConfig[event.event_type] || eventConfig.signup;
                    const Icon = cfg.icon;
                    const eventData = event.event_data as Record<string, unknown> | null;

                    return (
                      <div key={event.id} className="relative flex items-start gap-3 py-2 pl-0">
                        <div className={`relative z-10 flex items-center justify-center h-9 w-9 rounded-full shrink-0 ${cfg.bg}`}>
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                            {event.utm_source && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                                {event.utm_source}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span>{formatTime(event.created_at)}</span>
                            {event.page_path && event.page_path !== '/' && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[200px]">{event.page_path}</span>
                              </>
                            )}
                            {eventData?.course_title && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[200px]">{String(eventData.course_title)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
            {hasMore && (
              <div className="pt-3 flex justify-center">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowAll(prev => !prev)}>
                  {showAll ? (
                    <><ChevronUp className="h-3.5 w-3.5 mr-1" /> Mostrar menos</>
                  ) : (
                    <><ChevronDown className="h-3.5 w-3.5 mr-1" /> Ver todos ({events.length})</>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
