import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/StatCard';
import { Globe, UserPlus, UserCheck, Target, ShoppingCart, ChevronRight } from 'lucide-react';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: visitorRows } = await supabase.from('site_visits').select('visitor_id');

    const leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true });
    const subscribedQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'subscribed');
    const opportunityQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'opportunity');
    const salesQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid');

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
    <div>
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
