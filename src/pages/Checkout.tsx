import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Play, 
  Clock, 
  BookOpen, 
  Check, 
  Shield, 
  Loader2,
  ArrowLeft
} from 'lucide-react';
import logoKanaflix from '@/assets/logo-kanaflix.png';

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  is_published: boolean;
}

interface LessonCount {
  count: number;
}

export default function Checkout() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessonCount, setLessonCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);

  // Auto-open checkout if query param is set (after redirect from login)
  useEffect(() => {
    if (searchParams.get('open') === 'checkout' && user && course && !isEnrolled) {
      setCheckoutOpen(true);
    }
  }, [searchParams, user, course, isEnrolled]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  useEffect(() => {
    if (user && courseId) {
      checkEnrollment();
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

    // Fetch lesson count
    const { count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('is_hidden', false);

    setLessonCount(count || 0);
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

  const handleBuyClick = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/checkout/${courseId}?open=checkout`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    
    // Handle free courses - enroll directly
    if (course && course.price === 0) {
      setCheckingEnrollment(true);
      try {
        const { error } = await supabase
          .from('course_enrollments')
          .insert({
            user_id: user.id,
            course_id: courseId
          });
        
        if (error) {
          if (error.code === '23505') {
            // Already enrolled
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
      return;
    }
    
    setCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsEnrolled(true);
    setCheckoutOpen(false);
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-12 w-full mt-8" />
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
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoKanaflix} alt="Kanaflix" className="h-8 w-auto" />
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
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Course Image */}
            <div className="relative">
              {course.thumbnail_url ? (
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-full aspect-[4/5] object-cover rounded-2xl shadow-xl"
                />
              ) : (
                <div className="w-full aspect-[4/5] bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Overlay badge */}
              {course.price === 0 && (
                <Badge className="absolute top-4 left-4 bg-success text-success-foreground">
                  Gratuito
                </Badge>
              )}
            </div>

            {/* Course Info */}
            <div className="flex flex-col">
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    {course.title}
                  </h1>
                  {course.description && (
                    <p className="text-muted-foreground leading-relaxed">
                      {course.description}
                    </p>
                  )}
                </div>

                {/* Course Stats */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{lessonCount} aulas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    <span>Acesso imediato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Acesso vitalício</span>
                  </div>
                </div>

                {/* Features */}
                <Card className="bg-muted/30 border-0">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-medium text-sm text-foreground">O que está incluído:</h3>
                    <ul className="space-y-2">
                      {[
                        'Acesso completo a todas as aulas',
                        'Materiais complementares para download',
                        'Certificado de conclusão',
                        'Atualizações gratuitas do conteúdo',
                        'Suporte via comentários nas aulas'
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-success shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Price & CTA */}
              <div className="mt-8 space-y-4">
                {isEnrolled ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-success">
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
                ) : (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-foreground">
                        {course.price === 0 ? 'Grátis' : formatPrice(course.price)}
                      </span>
                      {course.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          ou em até 12x
                        </span>
                      )}
                    </div>

                    <Button 
                      size="lg" 
                      className="w-full h-14 text-lg gap-2"
                      onClick={handleBuyClick}
                      disabled={checkingEnrollment}
                    >
                      {checkingEnrollment ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="h-5 w-5" />
                          {course.price === 0 ? 'Matricular-se Gratuitamente' : 'Comprar Agora'}
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Pagamento 100% seguro</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Kanaflix Play. Todos os direitos reservados.
        </div>
      </footer>

      {/* Checkout Modal */}
      {course && (
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          course={course}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
