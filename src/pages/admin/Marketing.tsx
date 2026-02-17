import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, FileText, Mail, MessageSquare, BarChart3, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';

const tools = [
  {
    title: 'Banco de Leads',
    description: 'Visualize e gerencie todos os seus leads capturados',
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary/10',
    url: '/admin/marketing/leads',
  },
  {
    title: 'Formulários',
    description: 'Crie formulários de captura para usar externamente',
    icon: FileText,
    color: 'text-chart-3',
    bg: 'bg-chart-3/10',
    url: '/admin/marketing/forms',
  },
  {
    title: 'Campanhas de Email',
    description: 'Envie emails em massa para seus leads e alunos',
    icon: Mail,
    color: 'text-chart-2',
    bg: 'bg-chart-2/10',
    url: '/admin/marketing/email',
    comingSoon: true,
  },
  {
    title: 'WhatsApp',
    description: 'Envie mensagens via WhatsApp para seus contatos',
    icon: MessageSquare,
    color: 'text-chart-4',
    bg: 'bg-chart-4/10',
    url: '/admin/marketing/whatsapp',
    comingSoon: true,
  },
];

export default function MarketingHub() {
  const navigate = useNavigate();
  const [totalLeads, setTotalLeads] = useState<number | null>(null);
  const [activeForms, setActiveForms] = useState<number | null>(null);
  const [conversions, setConversions] = useState<number | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const [{ count: leads }, { count: forms }, { count: conv }] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('lead_forms').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
      ]);
      setTotalLeads(leads || 0);
      setActiveForms(forms || 0);
      setConversions(conv || 0);
    };
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hub de ferramentas de marketing e automação
        </p>
      </div>

      {/* Metrics row */}
      <div className="grid gap-3 grid-cols-1 xs:grid-cols-3">
        <MetricCard icon={Users} label="Total de Leads" value={totalLeads !== null ? String(totalLeads) : '—'} color="text-primary" bg="bg-primary/10" />
        <MetricCard icon={Megaphone} label="Formulários Ativos" value={activeForms !== null ? String(activeForms) : '—'} color="text-chart-3" bg="bg-chart-3/10" />
        <MetricCard icon={BarChart3} label="Conversões" value={conversions !== null ? String(conversions) : '—'} color="text-chart-2" bg="bg-chart-2/10" />
      </div>

      {/* Tools grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/20 ${tool.comingSoon ? 'opacity-60' : ''}`}
              onClick={() => !tool.comingSoon && navigate(tool.url)}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`p-3 rounded-xl ${tool.bg} shrink-0`}>
                  <tool.icon className={`h-6 w-6 ${tool.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{tool.title}</h3>
                    {tool.comingSoon && (
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Em breve
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string; color: string; bg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="h-full">
      <Card className="h-full">
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl shrink-0 ${bg}`}>
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
            </div>
            <span className="stat-card-label text-xs sm:text-sm">{label}</span>
          </div>
          <div className="stat-card-value text-xl sm:text-3xl">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
