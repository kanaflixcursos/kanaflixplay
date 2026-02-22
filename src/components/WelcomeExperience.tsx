import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  ShoppingCart,
  Clock,
  Sparkles,
  PlayCircle,
  MessageSquare,
  CreditCard,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AvailableCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number | null;
  category_name: string | null;
  total_duration: number;
}

function formatPrice(cents: number | null): string {
  if (!cents || cents === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
}

const tips = [
  {
    icon: PlayCircle,
    title: 'Assista às aulas',
    description: 'Acompanhe seu progresso e continue de onde parou a qualquer momento.',
  },
  {
    icon: MessageSquare,
    title: 'Comente e interaja',
    description: 'Tire dúvidas diretamente nas aulas e troque experiências.',
  },
  {
    icon: CreditCard,
    title: 'Pagamento seguro',
    description: 'PIX, boleto ou cartão de crédito com parcelamento.',
  },
  {
    icon: GraduationCap,
    title: 'Aprenda no seu ritmo',
    description: 'Acesso ilimitado ao conteúdo, estude quando e onde quiser.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function WelcomeExperience() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, price, category_id, course_categories(name)')
        .eq('is_published', true);

      const coursesWithDuration = await Promise.all(
        (data || []).map(async (course: any) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('duration_minutes')
            .eq('course_id', course.id);

          const total_duration = lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            thumbnail_url: course.thumbnail_url,
            price: course.price,
            category_name: course.course_categories?.name || null,
            total_duration,
          };
        })
      );

      setCourses(coursesWithDuration);
      setLoading(false);
    };

    fetchCourses();
  }, [user]);

  const freeCourses = courses.filter((c) => !c.price || c.price === 0);
  const paidCourses = courses.filter((c) => c.price && c.price > 0);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Estudante';

  return (
    <motion.div
      className="space-y-8 md:space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Welcome */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground px-6 py-8 md:px-10 md:py-12">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        <div className="relative z-10 max-w-xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium mb-4"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Bem-vindo(a) à plataforma!
          </motion.div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-sm md:text-base text-primary-foreground/80 leading-relaxed">
            Estamos felizes em ter você aqui. Explore nossos cursos, matricule-se e comece a aprender agora mesmo!
          </p>
        </div>
      </motion.div>

      {/* Tips Section */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Como funciona
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tips.map((tip, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
            >
              <Card className="p-4 h-full hover:shadow-md transition-shadow group">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <tip.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{tip.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Free Courses */}
      {(loading || freeCourses.length > 0) && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              🎁 Comece grátis
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
              <Link to="/catalog">
                Ver catálogo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <CourseGridSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {freeCourses.map((course, i) => (
                <CourseCard key={course.id} course={course} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Paid Courses */}
      {(loading || paidCourses.length > 0) && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              🚀 Invista no seu futuro
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
              <Link to="/catalog">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <CourseGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {paidCourses.map((course, i) => (
                <CourseCard key={course.id} course={course} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Empty fallback */}
      {!loading && courses.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="py-12 flex flex-col items-center text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum curso disponível no momento.</p>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function CourseCard({ course, index }: { course: AvailableCourse; index: number }) {
  const isFree = !course.price || course.price === 0;
  const linkTo = isFree ? `/checkout/${course.id}` : `/checkout/${course.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
    >
      <Link to={linkTo}>
        <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col group">
          {/* Thumbnail */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted rounded-t-lg">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            {/* Overlay badge */}
            {isFree && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-success/90 text-success-foreground text-[10px] font-bold uppercase tracking-wide border-0">
                  Grátis
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-3 flex flex-col flex-1 gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {course.category_name && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {course.category_name}
                </Badge>
              )}
              {course.total_duration > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {formatDuration(course.total_duration)}
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold leading-snug line-clamp-2">{course.title}</h3>

            {/* Price */}
            <div className="flex items-center justify-between pt-1.5 border-t border-border mt-auto">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Preço</span>
                <p className={`text-sm font-semibold leading-tight ${isFree ? 'text-success' : 'text-primary'}`}>
                  {formatPrice(course.price)}
                </p>
              </div>
              {isFree ? (
                <Badge variant="secondary" className="text-[10px] font-semibold text-success uppercase">
                  Matricular
                </Badge>
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function CourseGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </Card>
      ))}
    </div>
  );
}
