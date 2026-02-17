import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/StatCard';
import { Globe, UserPlus, UserCheck, Target, ShoppingCart, ChevronRight } from 'lucide-react';

interface FunnelData {
  visitors: number | null;
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

export default function FunnelRoadmap() {
  const [data, setData] = useState<FunnelData>({ visitors: null, leads: 0, qualified: 0, opportunities: 0, sales: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [
        { count: totalLeads },
        { count: qualifiedCount },
        { count: opportunityCount },
        { count: convertedCount },
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'opportunity'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
      ]);
      setData({
        visitors: null,
        leads: totalLeads || 0,
        qualified: qualifiedCount || 0,
        opportunities: opportunityCount || 0,
        sales: convertedCount || 0,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const getValue = (key: typeof stages[number]['key']) => {
    if (key === 'visitors') return '—';
    return data[key];
  };

  return (
    <div className="flex items-stretch gap-0">
      {stages.map((stage, i) => (
        <div key={stage.key} className="flex items-stretch flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <StatCard
              title={stage.label}
              value={loading ? '...' : String(getValue(stage.key))}
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
      ))}
    </div>
  );
}
