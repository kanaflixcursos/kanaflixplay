import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { leadStatusMap } from '@/lib/lead-constants';
import { Lead, LeadForm } from '../types';
import StatCard from '@/components/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart3, Calendar } from 'lucide-react';

interface FormMetricsProps {
  form: LeadForm;
}

async function fetchFormMetrics(formId: string) {
    const [{ count: total }, { count: newCount }, { count: converted }, { data: leadsData }] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('form_id', formId),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('form_id', formId).eq('status', 'new'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('form_id', formId).eq('status', 'converted'),
        supabase.from('leads').select('id, name, email, phone, status, created_at, custom_data').eq('form_id', formId).order('created_at', { ascending: false }).limit(20),
    ]);
    return {
        total: total || 0,
        new: newCount || 0,
        converted: converted || 0,
        leads: (leadsData as Lead[]) || [],
    }
}

export function FormMetrics({ form }: FormMetricsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['formMetrics', form.id],
    queryFn: () => fetchFormMetrics(form.id),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-3">
        <StatCard icon={Users} title="Total de Leads" value={metrics?.total} loading={isLoading} />
        <StatCard icon={Calendar} title="Novos" value={metrics?.new} loading={isLoading} />
        <StatCard icon={BarChart3} title="Convertidos" value={metrics?.converted} loading={isLoading} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Contato</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Data</th></tr></thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={4} className="p-2"><div className="h-8 bg-muted rounded-md animate-pulse" /></td></tr>)
                ) : metrics?.leads.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum lead capturado.</td></tr>
                ) : metrics?.leads.map(lead => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">{lead.name || '—'}</td>
                    <td className="p-3 text-muted-foreground">{lead.email}</td>
                    <td className="p-3"><Badge variant={leadStatusMap[lead.status]?.variant || 'secondary'}>{leadStatusMap[lead.status]?.label || lead.status}</Badge></td>
                    <td className="p-3 text-muted-foreground text-xs">{format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
