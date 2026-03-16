import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Users, FileText, Mail, MessageSquare, Ticket, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import FunnelRoadmap from '@/components/admin/FunnelRoadmap';
import CustomerJourneyTimeline from '@/components/admin/CustomerJourneyTimeline';

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
    color: 'text-primary',
    bg: 'bg-primary/10',
    url: '/admin/marketing/forms',
  },
  {
    title: 'Campanhas de Email',
    description: 'Envie emails em massa para seus leads e alunos',
    icon: Mail,
    color: 'text-primary',
    bg: 'bg-primary/10',
    url: '/admin/marketing/email',
  },
  {
    title: 'Cupons de Desconto',
    description: 'Crie cupons promocionais para seus cursos',
    icon: Ticket,
    color: 'text-primary',
    bg: 'bg-primary/10',
    url: '/admin/marketing/coupons',
  },
  {
    title: 'Combos',
    description: 'Crie pacotes de cursos com preços especiais',
    icon: Package,
    color: 'text-primary',
    bg: 'bg-primary/10',
    url: '/admin/marketing/combos',
  },
  {
    title: 'WhatsApp',
    description: 'Envie mensagens via WhatsApp para seus contatos',
    icon: MessageSquare,
    color: 'text-primary',
    bg: 'bg-primary/10',
    url: '/admin/marketing/whatsapp',
    comingSoon: true,
  },
];

export default function MarketingHub() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hub de ferramentas de marketing e automação
        </p>
      </div>

      <FunnelRoadmap />

      <CustomerJourneyTimeline showFilters limit={50} defaultVisible={15} title="Jornada dos Visitantes" />

      {/* Tools grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
                      <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
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
