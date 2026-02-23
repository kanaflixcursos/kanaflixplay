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
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [contentFilter, setContentFilter] = useState<string>('all');
  const [utmSources, setUtmSources] = useState<string[]>([]);
  const [utmCampaigns, setUtmCampaigns] = useState<string[]>([]);
  const [utmContents, setUtmContents] = useState<string[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchData();
  }, [utmFilter, campaignFilter, contentFilter]);

  const fetchFilterOptions = async () => {
    const [{ data: srcData }, { data: campData }, { data: contData }] = await Promise.all([
      supabase.from('site_visits').select('utm_source').not('utm_source', 'is', null),
      supabase.from('site_visits').select('utm_campaign').not('utm_campaign', 'is', null),
      supabase.from('site_visits').select('utm_content').not('utm_content', 'is', null),
    ]);

    const toUnique = (rows: { [k: string]: string | null }[] | null, key: string) =>
      [...new Set((rows || []).map(r => r[key]).filter(Boolean) as string[])].sort();

    setUtmSources(toUnique(srcData, 'utm_source'));
    setUtmCampaigns(toUnique(campData, 'utm_campaign'));
    setUtmContents(toUnique(contData, 'utm_content'));
  };

  const fetchData = async () => {
    setLoading(true);
    const hasSource = utmFilter !== 'all';
    const hasCampaign = campaignFilter !== 'all';
    const hasContent = contentFilter !== 'all';

    const applyUtmFilters = (q: any) => {
      if (hasSource) q = q.eq('utm_source', utmFilter);
      if (hasCampaign) q = q.eq('utm_campaign', campaignFilter);
      if (hasContent) q = q.eq('utm_content', contentFilter);
      return q;
    };

    // Visitors: unique visitor_ids from site_visits
    let visitQuery = supabase.from('site_visits').select('visitor_id');
    visitQuery = applyUtmFilters(visitQuery);
    const { data: visitorRows } = await visitQuery;

    // Leads
    let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true });
    if (hasSource) leadsQuery = leadsQuery.eq('utm_source', utmFilter);
    if (hasCampaign) leadsQuery = leadsQuery.eq('utm_campaign', campaignFilter);
    if (hasContent) leadsQuery = leadsQuery.eq('utm_content', contentFilter);

    let qualifiedQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified');
    if (hasSource) qualifiedQuery = qualifiedQuery.eq('utm_source', utmFilter);
    if (hasCampaign) qualifiedQuery = qualifiedQuery.eq('utm_campaign', campaignFilter);
    if (hasContent) qualifiedQuery = qualifiedQuery.eq('utm_content', contentFilter);

    let opportunityQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'opportunity');
    if (hasSource) opportunityQuery = opportunityQuery.eq('utm_source', utmFilter);
    if (hasCampaign) opportunityQuery = opportunityQuery.eq('utm_campaign', campaignFilter);
    if (hasContent) opportunityQuery = opportunityQuery.eq('utm_content', contentFilter);

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
      {/* UTM filters */}
      {(utmSources.length > 0 || utmCampaigns.length > 0 || utmContents.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {utmSources.length > 0 && (
            <Select value={utmFilter} onValueChange={setUtmFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
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
          {utmCampaigns.length > 0 && (
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas campanhas</SelectItem>
                {utmCampaigns.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {utmContents.length > 0 && (
            <Select value={contentFilter} onValueChange={setContentFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Conteúdo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos conteúdos</SelectItem>
                {utmContents.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
