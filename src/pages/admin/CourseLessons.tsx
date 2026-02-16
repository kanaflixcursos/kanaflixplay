import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'react-iconly';
import CourseLessonsManager from '@/components/admin/CourseLessonsManager';

export default function CourseLessons() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  if (!courseId) {
    navigate('/admin/courses');
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/courses')}>
          <ArrowLeft set="light" size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-medium">Organizar Aulas</h1>
          <p className="text-sm text-muted-foreground">
            Organize módulos e aulas • Arraste para reordenar
          </p>
        </div>
      </div>

      <CourseLessonsManager courseId={courseId} />
    </div>
  );
}
