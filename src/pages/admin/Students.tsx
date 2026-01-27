import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Users, Loader2, UserPlus, MoreHorizontal, Eye, Pencil, Trash2, Search, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import PhoneInput from '@/components/PhoneInput';
import { useIsMobile } from '@/hooks/use-mobile';

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  role: string;
  enrolledCourses: number;
  created_at: string;
  last_seen_at: string | null;
}

interface Course {
  id: string;
  title: string;
}

export default function AdminStudents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  
  // Enroll dialog
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [enrolling, setEnrolling] = useState(false);
  
  // View profile dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  
  // Edit profile dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
const [editForm, setEditForm] = useState({ full_name: '', phone: '', birth_date: '', email: '' });
  const [emailChangePending, setEmailChangePending] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Reset progress dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetStudent, setResetStudent] = useState<Student | null>(null);
  const [resetType, setResetType] = useState<'all' | 'course'>('all');
  const [resetCourseId, setResetCourseId] = useState<string>('');
  const [resetting, setResetting] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);

  const fetchData = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

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
      email: profile.email || '',
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      birth_date: profile.birth_date,
      role: rolesMap.get(profile.user_id) || 'student',
      enrolledCourses: enrollmentCounts.get(profile.user_id) || 0,
      created_at: profile.created_at,
      last_seen_at: profile.last_seen_at,
    }));

    setStudents(studentsWithData);

    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true);

    setCourses(coursesData || []);
    setLoading(false);

    const editId = searchParams.get('edit');
    if (editId) {
      const studentToEdit = studentsWithData.find(s => s.user_id === editId);
      if (studentToEdit) {
        handleOpenEditDialog(studentToEdit);
      }
    }
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

  const handleOpenViewDialog = (student: Student) => {
    setViewingStudent(student);
    setViewDialogOpen(true);
  };

  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student);
    setEditForm({
      full_name: student.full_name === 'Sem nome' ? '' : student.full_name,
      phone: student.phone || '',
      birth_date: student.birth_date || '',
      email: student.email || '',
    });
    setEmailChangePending(false);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingStudent(null);
    if (searchParams.has('edit')) {
      searchParams.delete('edit');
      setSearchParams(searchParams);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;

    setSaving(true);

    // Validate email format if changed
    const emailChanged = editForm.email !== editingStudent.email;
    if (emailChanged && editForm.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        toast.error('Email inválido');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name || null,
        phone: editForm.phone || null,
        birth_date: editForm.birth_date || null,
      })
      .eq('user_id', editingStudent.user_id);

    if (error) {
      toast.error('Erro ao salvar perfil');
      setSaving(false);
      return;
    }

    // If email changed, trigger email change in auth (requires edge function)
    if (emailChanged && editForm.email) {
      const { error: emailError } = await supabase.functions.invoke('update-user-email', {
        body: { user_id: editingStudent.user_id, new_email: editForm.email }
      });

      if (emailError) {
        toast.error('Erro ao atualizar email. Perfil salvo, mas email não alterado.');
      } else {
        setEmailChangePending(true);
        toast.success('Perfil salvo! Um email de confirmação foi enviado para o novo endereço.');
        fetchData();
        handleCloseEditDialog();
        setSaving(false);
        return;
      }
    }

    toast.success('Perfil atualizado com sucesso!');
    fetchData();
    handleCloseEditDialog();
    setSaving(false);
  };

  const handleOpenDeleteDialog = (student: Student) => {
    setDeletingStudent(student);
    setDeleteConfirmation('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent || deleteConfirmation !== deletingStudent.full_name) {
      toast.error('Digite o nome do usuário corretamente para confirmar');
      return;
    }

    setDeleting(true);

    const userId = deletingStudent.user_id;

    await supabase.from('course_enrollments').delete().eq('user_id', userId);
    await supabase.from('lesson_progress').delete().eq('user_id', userId);
    await supabase.from('lesson_comments').delete().eq('user_id', userId);
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);

    if (error) {
      toast.error('Erro ao excluir usuário');
    } else {
      toast.success('Usuário excluído com sucesso!');
      fetchData();
      setDeleteDialogOpen(false);
    }

    setDeleting(false);
  };

  const handleOpenResetDialog = async (student: Student) => {
    setResetStudent(student);
    setResetType('all');
    setResetCourseId('');
    setResetting(false);
    
    // Fetch courses the student is enrolled in
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', student.user_id);
    
    if (enrollments && enrollments.length > 0) {
      const courseIds = enrollments.map(e => e.course_id);
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);
      
      setEnrolledCourses(coursesData || []);
    } else {
      setEnrolledCourses([]);
    }
    
    setResetDialogOpen(true);
  };

  const handleResetProgress = async () => {
    if (!resetStudent) return;
    
    if (resetType === 'course' && !resetCourseId) {
      toast.error('Selecione um curso');
      return;
    }

    setResetting(true);

    try {
      if (resetType === 'all') {
        // Reset all progress for this user
        const { error } = await supabase
          .from('lesson_progress')
          .delete()
          .eq('user_id', resetStudent.user_id);

        if (error) throw error;
        toast.success(`Progresso total de ${resetStudent.full_name} resetado com sucesso!`);
      } else {
        // Reset progress only for lessons in the selected course
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', resetCourseId);

        if (lessons && lessons.length > 0) {
          const lessonIds = lessons.map(l => l.id);
          const { error } = await supabase
            .from('lesson_progress')
            .delete()
            .eq('user_id', resetStudent.user_id)
            .in('lesson_id', lessonIds);

          if (error) throw error;
        }

        const courseName = enrolledCourses.find(c => c.id === resetCourseId)?.title || 'curso';
        toast.success(`Progresso de ${resetStudent.full_name} no curso "${courseName}" resetado com sucesso!`);
      }

      setResetDialogOpen(false);
    } catch (error) {
      console.error('Error resetting progress:', error);
      toast.error('Erro ao resetar progresso');
    }

    setResetting(false);
  };

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const StudentActions = ({ student }: { student: Student }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={() => handleOpenViewDialog(student)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenEnrollDialog(student)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Matricular em Curso
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToggleRole(student)}>
          {student.role === 'admin' ? 'Tornar Aluno' : 'Tornar Admin'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleOpenResetDialog(student)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetar Progresso
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleOpenDeleteDialog(student)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir Usuário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const MobileStudentCard = ({ student }: { student: Student }) => {
    const isExpanded = expandedStudentId === student.id;

    return (
      <Collapsible open={isExpanded} onOpenChange={() => setExpandedStudentId(isExpanded ? null : student.id)}>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {student.avatar_url ? (
                <img 
                  src={student.avatar_url} 
                  alt={student.full_name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium">
                    {student.full_name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{student.full_name}</p>
                <Badge variant={student.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                  {student.role === 'admin' ? 'Admin' : 'Aluno'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <StudentActions student={student} />
            </div>
          </div>
          
          <CollapsibleContent className="mt-4 pt-4 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Cursos:</span>
                <span className="ml-2 font-medium">{student.enrolledCourses}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span>
                <span className="ml-2">{student.phone || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Último acesso:</span>
                <span className="ml-2">{formatDateTime(student.last_seen_at)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Cadastro:</span>
                <span className="ml-2">{formatDate(student.created_at)}</span>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground text-sm md:text-base">Gerencie os alunos da plataforma</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full sm:w-64"
          />
        </div>
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
      ) : isMobile ? (
        // Mobile: Card list with collapsible details
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <MobileStudentCard key={student.id} student={student} />
          ))}
        </div>
      ) : (
        // Desktop: Table view
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-center">Cursos</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {student.avatar_url ? (
                        <img 
                          src={student.avatar_url} 
                          alt={student.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {student.full_name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{student.full_name}</span>
                        {student.email && (
                          <span className="text-xs text-muted-foreground">{student.email}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{student.enrolledCourses}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(student.last_seen_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {student.email || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <StudentActions student={student} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* View Profile Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Perfil do Usuário</DialogTitle>
          </DialogHeader>
          {viewingStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {viewingStudent.avatar_url ? (
                  <img 
                    src={viewingStudent.avatar_url} 
                    alt={viewingStudent.full_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-medium">
                      {viewingStudent.full_name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{viewingStudent.full_name}</h3>
                  <Badge variant={viewingStudent.role === 'admin' ? 'default' : 'secondary'}>
                    {viewingStudent.role === 'admin' ? 'Administrador' : 'Aluno'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{viewingStudent.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefone:</span>
                  <span>{viewingStudent.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data de Nascimento:</span>
                  <span>{formatDate(viewingStudent.birth_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cursos Matriculados:</span>
                  <span>{viewingStudent.enrolledCourses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Último Acesso:</span>
                  <span>{formatDateTime(viewingStudent.last_seen_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cadastrado em:</span>
                  <span>{formatDateTime(viewingStudent.created_at)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => !open && handleCloseEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário {editingStudent?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
              {editForm.email !== editingStudent?.email && editForm.email && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ Um email de confirmação será enviado para o novo endereço.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <PhoneInput
                value={editForm.phone}
                onChange={(value) => setEditForm(prev => ({ ...prev, phone: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                value={editForm.birth_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Excluir Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação é <strong>irreversível</strong>. Todos os dados do usuário serão permanentemente excluídos, incluindo:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Perfil e informações pessoais</li>
                <li>Matrículas em cursos</li>
                <li>Progresso nas aulas</li>
                <li>Comentários</li>
                <li>Notificações</li>
              </ul>
              <div className="pt-2">
                <Label htmlFor="confirm-delete">
                  Digite <strong>{deletingStudent?.full_name}</strong> para confirmar:
                </Label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Nome do usuário"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={deleting || deleteConfirmation !== deletingStudent?.full_name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Permanentemente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Progress Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Resetar Progresso
            </DialogTitle>
            <DialogDescription>
              Escolha o tipo de reset para {resetStudent?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="reset-all"
                  name="reset-type"
                  checked={resetType === 'all'}
                  onChange={() => setResetType('all')}
                  className="h-4 w-4"
                />
                <Label htmlFor="reset-all" className="cursor-pointer flex-1">
                  <span className="font-medium">Reset Total</span>
                  <p className="text-sm text-muted-foreground">
                    Remove todo o progresso do aluno em todos os cursos
                  </p>
                </Label>
              </div>
              
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  id="reset-course"
                  name="reset-type"
                  checked={resetType === 'course'}
                  onChange={() => setResetType('course')}
                  className="h-4 w-4 mt-1"
                />
                <Label htmlFor="reset-course" className="cursor-pointer flex-1">
                  <span className="font-medium">Reset por Curso</span>
                  <p className="text-sm text-muted-foreground">
                    Remove o progresso apenas do curso selecionado
                  </p>
                </Label>
              </div>
            </div>

            {resetType === 'course' && (
              <div className="pl-7">
                {enrolledCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este aluno não está matriculado em nenhum curso.
                  </p>
                ) : (
                  <Select value={resetCourseId} onValueChange={setResetCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrolledCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning-foreground">
                ⚠️ Esta ação irá remover todas as aulas concluídas e o tempo de estudo registrado. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleResetProgress} 
              disabled={resetting || (resetType === 'course' && !resetCourseId)}
              variant="destructive"
            >
              {resetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetando...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resetar Progresso
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
