import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, PlayCircle, TrendingUp } from 'lucide-react';

interface Stats {
  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
  totalLessons: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    publishedCourses: 0,
    totalStudents: 0,
    totalLessons: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: totalCourses },
        { count: publishedCourses },
        { count: totalStudents },
        { count: totalLessons },
      ] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalCourses: totalCourses || 0,
        publishedCourses: publishedCourses || 0,
        totalStudents: totalStudents || 0,
        totalLessons: totalLessons || 0,
      });

      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total de Cursos',
      value: stats.totalCourses,
      icon: BookOpen,
      description: `${stats.publishedCourses} publicados`,
    },
    {
      title: 'Total de Alunos',
      value: stats.totalStudents,
      icon: Users,
      description: 'Usuários registrados',
    },
    {
      title: 'Total de Aulas',
      value: stats.totalLessons,
      icon: PlayCircle,
      description: 'Em todos os cursos',
    },
    {
      title: 'Taxa de Publicação',
      value: stats.totalCourses > 0 
        ? `${Math.round((stats.publishedCourses / stats.totalCourses) * 100)}%`
        : '0%',
      icon: TrendingUp,
      description: 'Cursos publicados',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">
          Visão geral da plataforma Kanaflix Play
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="stat-card-label">{stat.title}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="stat-card-value">
                {loading ? '...' : stat.value}
              </div>
              <p className="stat-card-description">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <a href="/admin/courses" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <BookOpen className="h-8 w-8 mb-2 text-primary" />
                <h3 className="action-card-title">Gerenciar Cursos</h3>
                <p className="action-card-description">
                  Criar, editar e publicar cursos
                </p>
              </CardContent>
            </Card>
          </a>
          <a href="/admin/students" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 mb-2 text-primary" />
                <h3 className="action-card-title">Gerenciar Alunos</h3>
                <p className="action-card-description">
                  Ver alunos e matrículas
                </p>
              </CardContent>
            </Card>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
