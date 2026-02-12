import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface LastWatchedData {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail: string | null;
  moduleName: string | null;
  completedLessons: number;
  totalLessons: number;
}

export default function ContinueWatchingCard() {
  const { user } = useAuth();
  const [data, setData] = useState<LastWatchedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLastWatched = async () => {
      if (!user) return;

      // Get the most recent lesson progress entry (not completed, or most recent completed)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, completed_at, watched_seconds, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (!progressData || progressData.length === 0) {
        setLoading(false);
        return;
      }

      // Prefer incomplete lessons, fall back to the most recent one
      const incompleteLesson = progressData.find(p => !p.completed);
      const targetProgress = incompleteLesson || progressData[0];

      // Get lesson details
      const { data: lesson } = await supabase
        .from('lessons')
        .select('id, title, course_id, module_id')
        .eq('id', targetProgress.lesson_id)
        .single();

      if (!lesson) {
        setLoading(false);
        return;
      }

      // Get course details
      const { data: course } = await supabase
        .from('courses')
        .select('id, title, thumbnail_url')
        .eq('id', lesson.course_id)
        .single();

      if (!course) {
        setLoading(false);
        return;
      }

      // Get module name if exists
      let moduleName: string | null = null;
      if (lesson.module_id) {
        const { data: moduleData } = await supabase
          .from('course_modules')
          .select('title')
          .eq('id', lesson.module_id)
          .single();
        moduleName = moduleData?.title || null;
      }

      // Get progress counts for this course
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);

      const { data: lessonIds } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', course.id);

      const lessonIdSet = new Set(lessonIds?.map(l => l.id) || []);
      const completedLessons = progressData.filter(
        p => p.completed && lessonIdSet.has(p.lesson_id)
      ).length;

      setData({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        courseId: course.id,
        courseTitle: course.title,
        courseThumbnail: course.thumbnail_url,
        moduleName,
        completedLessons,
        totalLessons: totalLessons || 0,
      });
      setLoading(false);
    };

    fetchLastWatched();
  }, [user]);

  if (loading) {
    return <Skeleton className="h-36 w-full rounded-xl col-span-full" />;
  }

  if (!data) return null;

  const progress = data.totalLessons > 0
    ? Math.round((data.completedLessons / data.totalLessons) * 100)
    : 0;

  return (
    <motion.div
      className="col-span-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Link to={`/courses/${data.courseId}?lesson=${data.lessonId}`}>
        <Card className="relative overflow-hidden h-36 md:h-40 group cursor-pointer">
          {/* Background: base + thumbnail + gradient */}
          <div className="absolute inset-0 bg-card">
            {data.courseThumbnail && (
              <img
                src={data.courseThumbnail}
                alt={data.courseTitle}
                className="absolute right-0 top-0 w-[65%] h-full object-cover"
              />
            )}
            {/* Wide gradient overlay to fully hide image edge */}
            <div className="absolute inset-0 bg-gradient-to-r from-card from-30% via-card via-45% to-transparent" />
          </div>

          {/* Content left side */}
          <div className="absolute inset-0 z-10 flex items-center">
            <div className="flex-1 p-5 md:p-6 pr-0 max-w-[60%]">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Continuar de onde parou
              </p>
              <h3 className="text-base md:text-lg font-medium text-foreground line-clamp-1 mb-1">
                {data.lessonTitle}
              </h3>
              {data.moduleName && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                  {data.moduleName}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {data.courseTitle} · {data.completedLessons}/{data.totalLessons} aulas ({progress}%)
              </p>
            </div>
          </div>

          {/* Play button */}
          <div className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 z-10">
            <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:bg-primary transition-colors group-hover:scale-105 duration-200">
              <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
