import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, ShoppingCart, TrendingUp } from 'lucide-react';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ courses: 0, enrollments: 0, orders: 0, revenue: 0 });
  const [creatorName, setCreatorName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Get creator record
      const { data: creator } = await supabase
        .from('creators')
        .select('id, name')
        .eq('user_id', user.id)
        .single();

      if (!creator) {
        setLoading(false);
        return;
      }

      setCreatorName(creator.name);

      const [coursesRes, enrollmentsRes, ordersRes] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('creator_id', creator.id),
        supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('creator_id', creator.id),
        supabase.from('orders').select('amount, status').eq('creator_id', creator.id).eq('status', 'paid'),
      ]);

      const revenue = (ordersRes.data || []).reduce((sum, o) => sum + (o.amount || 0), 0);

      setStats({
        courses: coursesRes.count || 0,
        enrollments: enrollmentsRes.count || 0,
        orders: ordersRes.data?.length || 0,
        revenue,
      });
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  const statCards = [
    { title: 'Cursos', value: stats.courses, icon: BookOpen, color: 'text-primary' },
    { title: 'Alunos Matriculados', value: stats.enrollments, icon: Users, color: 'text-blue-500' },
    { title: 'Vendas', value: stats.orders, icon: ShoppingCart, color: 'text-green-500' },
    { title: 'Receita Total', value: `R$ ${(stats.revenue / 100).toFixed(2).replace('.', ',')}`, icon: TrendingUp, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {loading ? 'Carregando...' : `Olá, ${creatorName}`}
        </h1>
        <p className="text-muted-foreground text-sm">Visão geral do seu conteúdo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
