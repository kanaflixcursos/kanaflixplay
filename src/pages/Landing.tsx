import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoKanaflix from '@/assets/logo-kanaflix.png';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCourses(data);
      }
      setLoading(false);
    };

    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="mesh-gradient-bg" aria-hidden="true" />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <img src={logoKanaflix} alt="Kanaflix" className="h-8 w-auto" />
        {user ? (
          <Button onClick={() => navigate('/')} variant="default">
            Acessar Plataforma
          </Button>
        ) : (
          <Button onClick={() => navigate('/login')} variant="default">
            Entrar
          </Button>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-16 md:px-12 md:py-24">
        <div className="max-w-4xl">
          <h1 
            className="font-display text-foreground mb-6"
            style={{ fontSize: '70px', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.03em' }}
          >
            Um novo espaço para a oftalmologia
          </h1>
          <p 
            className="text-muted-foreground max-w-2xl"
            style={{ fontSize: '22px', fontWeight: 400, lineHeight: 1.5 }}
          >
            Conteúdos gratuitos e pagos. Direto ao ponto. Criado por oftalmologistas especialistas.
          </p>
        </div>
      </section>

      {/* Courses Section */}
      <section className="relative z-10 px-6 pb-16 md:px-12">
        <h2 className="text-2xl font-semibold mb-6">Cursos Disponíveis</h2>
        
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="flex-shrink-0 w-48 aspect-[4/5] bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="text-muted-foreground">Nenhum curso disponível no momento.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 md:-mx-12 md:px-12 scrollbar-hide">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={user ? `/courses/${course.id}` : '/login'}
                className="flex-shrink-0 group"
              >
                <div className="w-48 aspect-[4/5] rounded-lg overflow-hidden bg-muted relative">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <span className="text-4xl font-bold text-foreground/20">
                        {course.title.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-3 text-sm font-medium text-foreground line-clamp-2 w-48">
                  {course.title}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
