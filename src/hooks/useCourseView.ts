import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  fetchCourseById,
  checkEnrollment,
  fetchLessonsAndModules,
  fetchLessonProgress,
  fetchLessonMaterials,
  markLessonComplete,
  type CourseData,
  type LessonData,
  type ModuleData,
} from '@/services/lessonService';

export function useCourseView() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<LessonData | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [justUnlockedId, setJustUnlockedId] = useState<string | null>(null);
  const prevUnlockedCountRef = useRef<number>(0);

  // Sort lessons by module order then lesson order
  const sortLessons = useCallback(
    (rawLessons: any[], mods: ModuleData[]) => {
      const moduleOrderMap = new Map(mods.map((m) => [m.id, m.order_index]));
      return [...rawLessons].sort((a, b) => {
        const aModOrder = a.module_id ? moduleOrderMap.get(a.module_id) ?? 999 : -1;
        const bModOrder = b.module_id ? moduleOrderMap.get(b.module_id) ?? 999 : -1;
        if (aModOrder !== bModOrder) return aModOrder - bModOrder;
        return a.order_index - b.order_index;
      });
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!courseId) return;

      const courseData = await fetchCourseById(courseId);
      if (!isMounted) return;
      if (!courseData) {
        navigate('/courses');
        return;
      }
      setCourse(courseData);

      let enrolled = false;
      if (user) {
        enrolled = await checkEnrollment(user.id, courseId);
        if (!isMounted) return;
        setIsEnrolled(enrolled);
      }

      const { lessons: rawLessons, modules: mods } = await fetchLessonsAndModules(courseId);
      if (!isMounted) return;

      // Preview mode
      if (!enrolled) {
        if (rawLessons.length > 0) {
          setIsPreviewMode(true);
          setModules(mods);
          const sorted = sortLessons(
            rawLessons.map((l) => ({ ...l, completed: false, materials: [] })),
            mods
          );
          setLessons(sorted);
          setSelectedLesson(sorted[0] || null);
        } else {
          navigate(`/store/kanaflix/checkout/${courseId}`);
          return;
        }
        setLoading(false);
        return;
      }

      setModules(mods);

      const [progressMap, materialsMap] = await Promise.all([
        fetchLessonProgress(user!.id),
        fetchLessonMaterials(rawLessons.map((l) => l.id)),
      ]);
      if (!isMounted) return;

      const lessonsWithProgress = rawLessons.map((lesson) => ({
        ...lesson,
        completed: progressMap.get(lesson.id) || false,
        materials: materialsMap[lesson.id] || [],
      }));

      const sorted = sortLessons(lessonsWithProgress, mods);
      setLessons(sorted);

      if (!selectedLesson) {
        const firstIncomplete = sorted.find((l) => !l.completed);
        setSelectedLesson(firstIncomplete || sorted[0] || null);
      }

      setLoading(false);
    };

    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id]);

  // Mark lesson complete (manual or auto)
  const handleMarkComplete = useCallback(
    async (lessonId: string) => {
      if (!user) return;
      try {
        await markLessonComplete(user.id, lessonId);
        const updatedLessons = lessons.map((l) =>
          l.id === lessonId ? { ...l, completed: true } : l
        );
        setLessons(updatedLessons);
        if (selectedLesson?.id === lessonId) {
          setSelectedLesson({ ...selectedLesson, completed: true });
        }
        toast.success('Aula concluída!');

        // Auto advance
        const currentIndex = lessons.findIndex((l) => l.id === lessonId);
        if (currentIndex < lessons.length - 1) {
          setSelectedLesson(updatedLessons[currentIndex + 1]);
        }
      } catch {
        toast.error('Erro ao marcar aula como concluída');
      }
    },
    [user, lessons, selectedLesson]
  );

  // Auto-complete callback for the player
  const handleAutoComplete = useCallback(() => {
    if (!selectedLesson || isPreviewMode) return;
    const updatedLessons = lessons.map((l) =>
      l.id === selectedLesson.id ? { ...l, completed: true } : l
    );
    setLessons(updatedLessons);
    setSelectedLesson({ ...selectedLesson, completed: true });
    toast.success('Aula concluída!');

    const currentIndex = lessons.findIndex((l) => l.id === selectedLesson.id);
    if (currentIndex < lessons.length - 1) {
      setSelectedLesson(updatedLessons[currentIndex + 1]);
    }
  }, [selectedLesson, lessons, isPreviewMode]);

  // Pre-sale check
  const isPreSale = !!(course?.launch_date && new Date(course.launch_date) > new Date());

  // Unlocked lesson IDs
  const unlockedLessonIds = useMemo(() => {
    if (isPreviewMode) {
      const first = lessons[0];
      return first ? new Set([first.id]) : new Set<string>();
    }
    if (isPreSale) return new Set<string>();
    if (!course?.is_sequential) return new Set(lessons.map((l) => l.id));

    const unlocked = new Set<string>();
    for (let i = 0; i < lessons.length; i++) {
      if (i === 0) {
        unlocked.add(lessons[i].id);
      } else if (lessons[i - 1].completed) {
        unlocked.add(lessons[i].id);
      } else {
        break;
      }
    }
    return unlocked;
  }, [lessons, course?.is_sequential, isPreviewMode, isPreSale]);

  // Separate required vs optional
  const optionalModuleIds = new Set(modules.filter((m) => m.is_optional).map((m) => m.id));
  const requiredLessons = lessons.filter((l) => !l.module_id || !optionalModuleIds.has(l.module_id));
  const optionalLessons = lessons.filter((l) => l.module_id && optionalModuleIds.has(l.module_id));

  const unlockedCount = unlockedLessonIds.size;
  const completedCount = requiredLessons.filter((l) => l.completed).length;
  const progressPercent =
    requiredLessons.length > 0 ? Math.round((completedCount / requiredLessons.length) * 100) : 0;
  const isLessonLocked = (lessonId: string) => !unlockedLessonIds.has(lessonId);

  // Unlock animation detection
  useEffect(() => {
    if (
      prevUnlockedCountRef.current > 0 &&
      unlockedCount > prevUnlockedCountRef.current &&
      course?.is_sequential
    ) {
      const unlockedArray = Array.from(unlockedLessonIds);
      const newlyUnlockedId = unlockedArray[unlockedArray.length - 1];
      setJustUnlockedId(newlyUnlockedId);
      const timer = setTimeout(() => setJustUnlockedId(null), 2000);
      return () => clearTimeout(timer);
    }
    prevUnlockedCountRef.current = unlockedCount;
  }, [unlockedCount, unlockedLessonIds, course?.is_sequential]);

  const isPaidCourse = !!(course?.price && course.price > 0);

  return {
    courseId,
    course,
    lessons,
    modules,
    selectedLesson,
    setSelectedLesson,
    loading,
    isEnrolled,
    isPreviewMode,
    isPreSale,
    isPaidCourse,
    justUnlockedId,
    requiredLessons,
    optionalLessons,
    unlockedCount,
    completedCount,
    progressPercent,
    isLessonLocked,
    handleMarkComplete,
    handleAutoComplete,
    user,
  };
}
