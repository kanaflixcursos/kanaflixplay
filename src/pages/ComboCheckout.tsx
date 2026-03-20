import { useState, useEffect } from 'react';
import pagarmeLogo from '@/assets/pagarme-logo.svg';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { trackEvent } from '@/hooks/useTrackEvent';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckoutForm } from '@/features/checkout/CheckoutForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { 
  Play, Clock, BookOpen, Check, Loader2, ArrowLeft, Star, Package, AlertTriangle
} from 'lucide-react';

interface ComboData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  max_installments: number;
  courses: {
    course_id: string;
    title: string;
    thumbnail_url: string | null;
    price: number | null;
  }[];
}

export default function ComboCheckout() {
  const { comboId } = useParams<{ comboId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: settings } = useSiteSettings();
  
  const [combo, setCombo] = useState<ComboData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [allEnrolled, setAllEnrolled] = useState(false);

  useEffect(() => {
    if (comboId) fetchCombo();
  }, [comboId]);

  useEffect(() => {
    if (user && combo) {
      checkEnrollments();
      supabase.rpc('promote_lead_on_checkout', { user_email: user.email || '' });
    }
    if (combo && comboId) {
      trackEvent('checkout_started', { combo_id: comboId, combo_title: combo.title }, `/checkout/combo/${comboId}`, user?.id);
    }
  }, [user, combo]);

  const fetchCombo = async () => {
    if (!comboId) return;
    setLoading(true);

    const { data: comboData, error } = await supabase
      .from('combos')
      .select('*')
      .eq('id', comboId)
      .eq('is_active', true)
      .single();

    if (error || !comboData) {
      navigate('/404');
      return;
    }

    const { data: comboCourses } = await supabase
      .from('combo_courses')
      .select('course_id, courses:course_id(title, thumbnail_url, price)')
      .eq('combo_id', comboId);

    setCombo({
      ...comboData,
      courses: (comboCourses || []).map((cc: any) => ({
        course_id: cc.course_id,
        title: cc.courses?.title || '',
        thumbnail_url: cc.courses?.thumbnail_url || null,
        price: cc.courses?.price || null,
      })),
    } as ComboData);

    setLoading(false);
  };

  const checkEnrollments = async () => {
    if (!user || !combo) return;
    const courseIds = combo.courses.map(c => c.course_id);
    
    const { data } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', user.id)
      .in('course_id', courseIds);

    const enrolled = data?.map(e => e.course_id) || [];
    setEnrolledCourseIds(enrolled);
    setAllEnrolled(enrolled.length === courseIds.length);
  };

  const handlePaymentSuccess = (buyerEmail?: string) => {
    if (user) {
      setAllEnrolled(true);
      if (comboId) {
        trackEvent('checkout_completed', { combo_id: comboId, amount: combo?.price, combo_title: combo?.title }, `/checkout/combo/${comboId}`, user.id);
      }
    } else if (buyerEmail) {
      // Guest checkout: redirect to signup
      const navigate_fn = navigate;
      navigate_fn(`/login?tab=signup&email=${encodeURIComponent(buyerEmail)}&redirect=${encodeURIComponent('/courses')}`);
    }
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  // No longer redirect to login for paid combos — checkout is public

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
            <Skeleton className="aspect-video rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-64 w-full mt-8" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!combo) return null;

  const originalPrice = combo.courses.reduce((sum, c) => sum + (c.price || 0), 0);
  const discount = originalPrice > 0 ? Math.round((1 - combo.price / originalPrice) * 100) : 0;

  // Build a "fake course" object so the CheckoutForm works with existing logic
  const comboAsCourse = {
    id: combo.id,
    title: combo.title,
    price: combo.price,
    thumbnail_url: combo.thumbnail_url,
    max_installments: combo.max_installments,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="content-container px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link to="/"><Logo className="h-8 w-auto" /></Link>
          </div>
          {user ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>Meus Cursos</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Entrar</Button>
          )}
        </div>
      </header>

      <main className="flex-1 content-container px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-12">
            {/* Left - Combo info */}
            <div className="relative space-y-4">
              {combo.thumbnail_url ? (
                <img src={combo.thumbnail_url} alt={combo.title} className="w-full aspect-video object-cover rounded-2xl shadow-xl" />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}

              {combo.price > 0 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">Powered by</span>
                  <img src={pagarmeLogo} alt="Pagar.me" className="h-4 opacity-60 dark:brightness-0 dark:invert" />
                </div>
              )}

              {/* Course list */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Cursos incluídos ({combo.courses.length})</h3>
                {combo.courses.map(course => {
                  const isEnrolled = enrolledCourseIds.includes(course.course_id);
                  return (
                    <div key={course.course_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{course.title}</p>
                        {course.price ? (
                          <p className="text-xs text-muted-foreground line-through">{formatPrice(course.price)}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Grátis</p>
                        )}
                      </div>
                      {isEnrolled && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          <Check className="h-3 w-3 mr-0.5" /> Já possui
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right - Checkout */}
            <div className="flex flex-col">
              <div className="space-y-4 mb-6">
                <Badge variant="secondary" className="gap-1">
                  <Package className="h-3 w-3" /> Combo
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{combo.title}</h1>
                {combo.description && (
                  <p className="text-muted-foreground leading-relaxed">{combo.description}</p>
                )}

                {/* Pricing summary */}
                <div className="p-4 rounded-xl bg-muted/50 space-y-1.5">
                  {originalPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{combo.courses.length} cursos separados</span>
                      <span className="text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Preço do combo</span>
                    <span className="text-primary">{formatPrice(combo.price)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="text-sm text-success font-semibold text-right">Economia de {discount}%</div>
                  )}
                </div>

                {/* Warning about already enrolled courses */}
                {enrolledCourseIds.length > 0 && !allEnrolled && (
                  <div className="flex items-start gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        Você já possui {enrolledCourseIds.length} de {combo.courses.length} cursos
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        O combo inclui cursos que você já tem acesso. O preço não será ajustado.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="icon-box-sm"><BookOpen /></div>
                    <span>{combo.courses.length} cursos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="icon-box-sm"><Play /></div>
                    <span>Acesso imediato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="icon-box-sm"><Clock /></div>
                    <span>Validade de 1 ano</span>
                  </div>
                </div>
              </div>

              {allEnrolled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-success p-4 bg-success/10 rounded-xl">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Você já tem acesso a todos os cursos!</span>
                  </div>
                  <Button size="lg" className="w-full h-14 text-lg gap-2" onClick={() => navigate('/courses')}>
                    <Play className="h-5 w-5" /> Ver Meus Cursos
                  </Button>
                </div>
              ) : (
                <CheckoutForm
                  course={comboAsCourse}
                  onSuccess={handlePaymentSuccess}
                  comboId={combo.id}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 mt-auto">
        <div className="content-container px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {settings?.platform_name || 'Plataforma'}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
