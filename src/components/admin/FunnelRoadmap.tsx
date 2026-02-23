import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/StatCard';
import { Globe, UserPlus, UserCheck, Target, ShoppingCart, ChevronRight, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FunnelData {
  visitors: number;
  leads: number;
  qualified: number;
  opportunities: number;
  sales: number;
}

const stages = [
  { key: 'visitors' as const, label: 'Visitantes', icon: Globe },
  { key: 'leads' as const, label: 'Leads', icon: UserPlus },
  { key: 'qualified' as const, label: 'Qualificados', icon: UserCheck },
  { key: 'opportunities' as const, label: 'Oportunidades', icon: Target },
  { key: 'sales' as const, label: 'Vendas', icon: ShoppingCart },
];

function calcRate(current: number, previous: number): string | null {
  if (previous === 0) return null;
  return `${Math.round((current / previous) * 100)}%`;
}

export default function FunnelRoadmap() {
  const [data, setData] = useState<FunnelData>({ visitors: 0, leads: 0, qualified: 0, opportunities: 0, sales: 0 });
  const [loading, setLoading] = useState(true);
  const [utmFilter, setUtmFilter] = useState<string>('all');
  const [utmSources, setUtmSources] = useState<string[]>([]);

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    fetchData();
  }, [utmFilter]);

  const fetchSources = async () => {
    const { data: visits } = await supabase
      .from('site_visits')
      .select('utm_source')
      .not('utm_source', 'is', null);

    const sources = new Set<string>();
    visits?.forEach(v => { if (v.utm_source) sources.add(v.utm_source); });
    setUtmSources(Array.from(sources).sort());
  };

  const fetchData = async () => {
    setLoading(true);
    const hasFilter = utmFilter !== 'all';

    // Visitors: unique visitor_ids from site_visits
    let visitQuery = supabase.from('site_visits').select('visitor_id');
    if (hasFilter) visitQuery = visitQuery.eq('utm_source', utmFilter);
    const { data: visitorRows } = await visitQuery;

    // Leads
    let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true });
    if (hasFilter) leadsQuery = leadsQuery.eq('utm_source', utmFilter);

    let qualifiedQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified');
    if (hasFilter) qualifiedQuery = qualifiedQuery.eq('utm_source', utmFilter);

    let opportunityQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'opportunity');
    if (hasFilter) opportunityQuery = opportunityQuery.eq('utm_source', utmFilter);

    // Sales: orders with status paid
    // For UTM-filtered sales, we'd need to join with profiles. For now, show total.
    let salesQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid');

    const [
      { count: totalLeads },
      { count: qualifiedCount },
      { count: opportunityCount },
      { count: paidOrdersCount },
    ] = await Promise.all([
      leadsQuery,
      qualifiedQuery,
      opportunityQuery,
      salesQuery,
    ]);

    const uniqueVisitors = new Set(visitorRows?.map(r => r.visitor_id) || []).size;

    setData({
      visitors: uniqueVisitors,
      leads: totalLeads || 0,
      qualified: qualifiedCount || 0,
      opportunities: opportunityCount || 0,
      sales: paidOrdersCount || 0,
    });
    setLoading(false);
  };

  const values = [data.visitors, data.leads, data.qualified, data.opportunities, data.sales];

  return (
    <div className="space-y-3">
      {/* UTM filter */}
      {utmSources.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={utmFilter} onValueChange={setUtmFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Todas as origens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {utmSources.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-stretch gap-0">
        {stages.map((stage, i) => {
          const rate = i > 0 ? calcRate(values[i], values[i - 1]) : null;

          return (
            <div key={stage.key} className="flex items-stretch flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <StatCard
                  title={stage.label}
                  value={loading ? '...' : String(values[i])}
                  description={rate ? `${rate} de conversão` : undefined}
                  icon={stage.icon}
                  loading={loading}
                />
              </div>
              {i < stages.length - 1 && (
                <div className="flex items-center px-1 shrink-0 text-muted-foreground/40">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
