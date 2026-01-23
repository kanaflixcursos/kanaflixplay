import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Loader2, UserPlus } from 'lucide-react';

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  enrolledCourses: number;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [enrolling, setEnrolling] = useState(false);

  const fetchData = async () => {
    // Fetch profiles with roles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    // Get roles for each user
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

    // Get enrollment counts
    const { data: enrollmentsData } = await supabase
      .from('course_enrollments')
      .select('user_id');

    const enrollmentCounts = new Map<string, number>();
    enrollmentsData?.forEach(e => {
      enrollmentCounts.set(e.user_id, (enrollmentCounts.get(e.user_id) || 0) + 1);
    });

    const studentsWithData = (profilesData || []).map(profile => ({
      id: profile.id,
      user_id: profile.user_id,
      full_name: profile.full_name || 'Sem nome',
      email: '', // Email não está na tabela profiles
      role: rolesMap.get(profile.user_id) || 'student',
      enrolledCourses: enrollmentCounts.get(profile.user_id) || 0,
      created_at: profile.created_at,
    }));

    setStudents(studentsWithData);

    // Fetch courses for enrollment dialog
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true);

    setCourses(coursesData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEnrollDialog = (student: Student) => {
    setSelectedStudent(student);
    setSelectedCourse('');
    setEnrollDialogOpen(true);
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedCourse) {
      toast.error('Selecione um curso');
      return;
    }

    setEnrolling(true);

    const { error } = await supabase
      .from('course_enrollments')
      .insert({
        user_id: selectedStudent.user_id,
        course_id: selectedCourse,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Aluno já está matriculado neste curso');
      } else {
        toast.error('Erro ao matricular aluno');
      }
    } else {
      toast.success('Aluno matriculado com sucesso!');
      fetchData();
      setEnrollDialogOpen(false);
    }

    setEnrolling(false);
  };

  const handleToggleRole = async (student: Student) => {
    const newRole = student.role === 'admin' ? 'student' : 'admin';
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', student.user_id);

    if (error) {
      toast.error('Erro ao alterar função');
    } else {
      toast.success(`Função alterada para ${newRole}`);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alunos</h1>
        <p className="text-muted-foreground">Gerencie os alunos da plataforma</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {students.map((student) => (
            <Card key={student.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {student.full_name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{student.full_name}</h3>
                      <Badge variant={student.role === 'admin' ? 'default' : 'secondary'}>
                        {student.role === 'admin' ? 'Admin' : 'Aluno'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {student.enrolledCourses} {student.enrolledCourses === 1 ? 'curso' : 'cursos'} matriculado(s)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Desde {new Date(student.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEnrollDialog(student)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Matricular
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleRole(student)}
                    >
                      {student.role === 'admin' ? 'Tornar Aluno' : 'Tornar Admin'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Matricular Aluno</DialogTitle>
            <DialogDescription>
              Matricule {selectedStudent?.full_name} em um curso.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnroll} disabled={enrolling || !selectedCourse}>
              {enrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matriculando...
                </>
              ) : (
                'Matricular'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
