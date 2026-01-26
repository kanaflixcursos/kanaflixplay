import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import logoKanaflix from '@/assets/logo-kanaflix.png';
import { Loader2 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
}

export default function Landing() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (coursesData) {
        setCourses(coursesData);
      }

      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      if (enrollments) {
        setEnrolledCourseIds(new Set(enrollments.map(e => e.course_id)));
      }

      setLoading(false);
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitials = user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="mesh-gradient-bg" aria-hidden="true" />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <img src={logoKanaflix} alt="Kanaflix" className="h-8 w-auto" />
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/')} variant="default">
            Minha Área
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden md:block">
              {user.email}
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-16 md:px-12 md:py-24 text-center max-w-5xl mx-auto">
        <h1 
          className="font-display text-foreground mb-6"
          style={{ fontSize: 'clamp(36px, 8vw, 70px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.03em' }}
        >
          Um novo espaço para a oftalmologia
        </h1>
        <p 
          className="text-muted-foreground max-w-2xl mx-auto"
          style={{ fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 400, lineHeight: 1.5 }}
        >
          Conteúdos gratuitos e pagos. Direto ao ponto. Criado por oftalmologistas especialistas.
        </p>
      </section>

      {/* Courses Section */}
      <section className="relative z-10 px-6 pb-16 md:px-12 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="aspect-[4/5] bg-muted rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="text-muted-foreground text-center">Nenhum curso disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {courses.map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              
              return (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="group"
                >
                  <div className="aspect-[4/5] rounded-xl overflow-hidden bg-muted relative shadow-lg">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <span className="text-5xl font-bold text-foreground/20">
                          {course.title.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {isEnrolled && (
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                        Matriculado
                      </Badge>
                    )}
                  </div>
                  <h3 className="card-title mt-4 line-clamp-2 text-center">
                    {course.title}
                  </h3>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
