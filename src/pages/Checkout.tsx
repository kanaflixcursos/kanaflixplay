import { useState, useEffect } from 'react';
import pagarmeLogo from '@/assets/pagarme-logo.svg';
import { useTrackVisit } from '@/hooks/useTrackVisit';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { 
  Play, 
  Clock, 
  BookOpen, 
  Check, 
  Loader2,
  ArrowLeft,
  ChevronRight,
  CalendarClock
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  is_published: boolean;
  launch_date: string | null;
}

interface CourseModule {
  id: string;
  title: string;
  order_index: number;
  lessons: { id: string; title: string; order_index: number; duration_minutes: number | null }[];
}

export default function Checkout() {
  useTrackVisit('/checkout');
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessonCount, setLessonCount] = useState(0);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  useEffect(() => {
    if (user && courseId) {
      checkEnrollment();
      // Promote lead to "opportunity" when visiting checkout
      supabase.rpc('promote_lead_on_checkout', { user_email: user.email || '' });
    }
  }, [user, courseId]);

  const fetchCourse = async () => {
    if (!courseId) return;
    
    setLoading(true);
    
    const { data: courseData, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('is_published', true)
      .single();

    if (error || !courseData) {
      navigate('/404');
      return;
    }

    setCourse(courseData);

    // Fetch lesson count using RPC (bypasses RLS for public checkout)
    const { data: count } = await supabase
      .rpc('get_public_lesson_count', { course_id_param: courseId });

    setLessonCount(count || 0);

    // Fetch modules and lessons for this course
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .order('order_index');

    if (modulesData && modulesData.length > 0) {
      const modulesWithLessons = await Promise.all(
        modulesData.map(async (mod) => {
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('id, title, order_index, duration_minutes')
            .eq('module_id', mod.id)
            .eq('is_hidden', false)
            .order('order_index');
          return { ...mod, lessons: lessonsData || [] };
        })
      );
      setModules(modulesWithLessons);
    }

    setLoading(false);
  };

  const checkEnrollment = async () => {
    if (!user || !courseId) return;
    
    setCheckingEnrollment(true);
    
    const { data } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    setIsEnrolled(!!data);
    setCheckingEnrollment(false);
  };

  const handleFreeEnrollment = async () => {
    if (!user) {
      const returnUrl = `/checkout/${courseId}`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    
    setCheckingEnrollment(true);
    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          expires_at: expiresAt.toISOString()
        });
      
      if (error) {
        if (error.code === '23505') {
          setIsEnrolled(true);
        } else {
          throw error;
        }
      } else {
        setIsEnrolled(true);
        toast.success('Matrícula realizada com sucesso!');
      }
    } catch (error: any) {
      toast.error('Erro ao realizar matrícula: ' + error.message);
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsEnrolled(true);
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  // Redirect to login if not authenticated for paid courses
  useEffect(() => {
    if (!authLoading && !user && course && course.price > 0) {
      const returnUrl = `/checkout/${courseId}`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    }
  }, [authLoading, user, course, courseId, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="content-container px-4 h-16 flex items-center">
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <main className="content-container px-4 py-8">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-64 w-full mt-8" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="content-container px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link to="/"><Logo className="h-8 w-auto" /></Link>
          </div>
          
          {user ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Meus Cursos
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              Entrar
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 content-container px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-12">
            {/* Course Image */}
            <div className="relative">
              {course.thumbnail_url ? (
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-full aspect-[3/2] sm:aspect-[4/5] object-cover rounded-2xl shadow-xl"
                />
              ) : (
                <div className="w-full aspect-[3/2] sm:aspect-[4/5] bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Overlay badge */}
              {course.price === 0 && (
                <Badge className="absolute top-4 left-4 bg-success text-success-foreground">
                  Gratuito
                </Badge>
              )}
              {course.launch_date && new Date(course.launch_date) > new Date() && (
                <Badge className="absolute top-4 left-4 bg-chart-4 text-white">
                  <CalendarClock className="h-3 w-3 mr-1" />
                  Pré-venda
                </Badge>
              )}

              {/* Powered by Pagar.me */}
              {course.price > 0 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">Powered by</span>
                  <img
                    src={pagarmeLogo}
                    alt="Pagar.me"
                    className="h-4 opacity-60 dark:brightness-0 dark:invert"
                  />
                </div>
              )}


              {/* Course Modules & Lessons */}
              {modules.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-medium text-foreground mb-2">Conteúdo do curso</h3>
                  {modules.map((mod) => (
                    <Collapsible key={mod.id} defaultOpen={modules.length <= 3}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        <span className="text-sm font-medium text-foreground flex-1">{mod.title}</span>
                        <span className="text-xs text-muted-foreground">{mod.lessons.length} aulas</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ul className="ml-6 mt-1 space-y-0.5">
                          {mod.lessons.map((lesson) => (
                            <li key={lesson.id} className="flex items-center gap-2 py-1.5 px-2 text-xs text-muted-foreground">
                              <Play className="h-3 w-3 shrink-0" />
                              <span className="line-clamp-1 flex-1">{lesson.title}</span>
                              {lesson.duration_minutes != null && lesson.duration_minutes > 0 && (
                                <span className="shrink-0 tabular-nums">
                                  {lesson.duration_minutes >= 60
                                    ? `${Math.floor(lesson.duration_minutes / 60)}h${String(lesson.duration_minutes % 60).padStart(2, '0')}`
                                    : `${lesson.duration_minutes}min`}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>

            {/* Course Info & Checkout */}
            <div className="flex flex-col">
              <div className="space-y-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {course.title}
                </h1>
                {course.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                )}

                {/* Course Stats */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>{lessonCount} aulas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-chart-2/10">
                      <Play className="h-3.5 w-3.5 text-chart-2" />
                    </div>
                    <span>Acesso imediato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-chart-4/10">
                      <Clock className="h-3.5 w-3.5 text-chart-4" />
                    </div>
                    <span>Validade de 1 ano</span>
                  </div>
                </div>

                {/* Pre-sale notice */}
                {course.launch_date && new Date(course.launch_date) > new Date() && (
                  <div className="flex items-start gap-3 p-4 bg-chart-4/5 border border-chart-4/20 rounded-xl">
                    <CalendarClock className="h-5 w-5 text-chart-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-foreground">Pré-venda — Lançamento em {new Date(course.launch_date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Garanta sua vaga agora! O conteúdo estará disponível a partir da data de lançamento.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout or Enrolled State */}
              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-success p-4 bg-success/10 rounded-xl">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Você já tem acesso a este curso!</span>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg gap-2"
                    onClick={() => navigate(`/courses/${course.id}`)}
                  >
                    <Play className="h-5 w-5" />
                    Acessar Curso
                  </Button>
                </div>
              ) : course.price === 0 ? (
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-foreground">Grátis</div>
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg gap-2"
                    onClick={handleFreeEnrollment}
                    disabled={checkingEnrollment}
                  >
                    {checkingEnrollment ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Matricular-se Gratuitamente
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <CheckoutForm 
                  course={course} 
                  onSuccess={handlePaymentSuccess} 
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="content-container px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Kanaflix Play. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
