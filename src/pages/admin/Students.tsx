import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { toast } from 'sonner';
import { Users, Loader2, MoreHorizontal, Eye, Pencil, Trash2, Search, RotateCcw, Download, X, ShieldCheck, ShieldOff, BookPlus } from 'lucide-react';

import PhoneInput from '@/components/PhoneInput';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

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
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Bulk delete
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Reset progress dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetStudent, setResetStudent] = useState<Student | null>(null);
  const [resetType, setResetType] = useState<'all' | 'course'>('all');
  const [resetCourseId, setResetCourseId] = useState<string>('');
  const [resetting, setResetting] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);

  // Grant course dialog
  const [grantCourseDialogOpen, setGrantCourseDialogOpen] = useState(false);
  const [grantStudent, setGrantStudent] = useState<Student | null>(null);
  const [grantCourseId, setGrantCourseId] = useState<string>('');
  const [granting, setGranting] = useState(false);

  const fetchData = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
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

  const filteredStudents = useMemo(() =>
    students.filter(student =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [students, searchQuery]
  );

  const handleToggleRole = async (student: Student) => {
    const newRole = student.role === 'admin' ? 'student' : 'admin';
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', student.user_id);

    if (error) {
      toast.error('Erro ao alterar função');
    } else {
      toast.success(`Função alterada para ${newRole === 'admin' ? 'Administrador' : 'Aluno'}`);
      fetchData();
    }
  };

  const handleViewProfile = (student: Student) => {
    navigate(`/admin/students/${student.user_id}`);
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
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: deletingStudent.user_id }
      });
      if (error) throw new Error(error.message || 'Erro ao excluir usuário');
      toast.success('Usuário excluído completamente do sistema!');
      fetchData();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      // Error handled by toast
      toast.error(error.message || 'Erro ao excluir usuário');
    }
    setDeleting(false);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of selectedIds) {
      const student = students.find(s => s.user_id === userId);
      if (!student) continue;

      try {
        const { error } = await supabase.functions.invoke('delete-user', {
          body: { user_id: userId }
        });
        if (error) throw error;
        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) toast.success(`${successCount} usuário(s) excluído(s) com sucesso!`);
    if (errorCount > 0) toast.error(`${errorCount} usuário(s) não puderam ser excluídos`);

    setSelectedIds(new Set());
    setBulkDeleteDialogOpen(false);
    setBulkDeleting(false);
    fetchData();
  };

  // Export CSV
  const handleExportCSV = () => {
    const toExport = selectedIds.size > 0
      ? students.filter(s => selectedIds.has(s.user_id))
      : filteredStudents;

    const headers = ['Nome', 'Email', 'Telefone', 'Cursos Matriculados', 'Função', 'Cadastro', 'Último Acesso'];
    const rows = toExport.map(s => [
      s.full_name,
      s.email,
      s.phone || '',
      s.enrolledCourses.toString(),
      s.role,
      formatDate(s.created_at),
      formatDateTime(s.last_seen_at),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${toExport.length} aluno(s) exportado(s)!`);
  };

  const handleOpenResetDialog = async (student: Student) => {
    setResetStudent(student);
    setResetType('all');
    setResetCourseId('');
    setResetting(false);
    
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
        const { error } = await supabase.from('lesson_progress').delete().eq('user_id', resetStudent.user_id);
        if (error) throw error;
        toast.success(`Progresso total de ${resetStudent.full_name} resetado com sucesso!`);
      } else {
        const { data: lessons } = await supabase.from('lessons').select('id').eq('course_id', resetCourseId);
        if (lessons && lessons.length > 0) {
          const lessonIds = lessons.map(l => l.id);
          const { error } = await supabase.from('lesson_progress').delete().eq('user_id', resetStudent.user_id).in('lesson_id', lessonIds);
          if (error) throw error;
        }
        const courseName = enrolledCourses.find(c => c.id === resetCourseId)?.title || 'curso';
        toast.success(`Progresso de ${resetStudent.full_name} no curso "${courseName}" resetado com sucesso!`);
      }
      setResetDialogOpen(false);
    } catch {
      toast.error('Erro ao resetar progresso');
    }
    setResetting(false);
  };

  const handleOpenGrantCourseDialog = (student: Student) => {
    setGrantStudent(student);
    setGrantCourseId('');
    setGrantCourseDialogOpen(true);
  };

  const handleGrantCourse = async () => {
    if (!grantStudent || !grantCourseId) {
      toast.error('Selecione um curso');
      return;
    }

    setGranting(true);
    try {
      // Check if already enrolled
      const { data: existing } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', grantStudent.user_id)
        .eq('course_id', grantCourseId)
        .maybeSingle();

      if (existing) {
        toast.error('Aluno já está matriculado neste curso');
        setGranting(false);
        return;
      }

      const { error } = await supabase
        .from('course_enrollments')
        .insert({ user_id: grantStudent.user_id, course_id: grantCourseId });

      if (error) throw error;

      const courseName = courses.find(c => c.id === grantCourseId)?.title || 'curso';
      toast.success(`${grantStudent.full_name} matriculado em "${courseName}" com sucesso!`);
      setGrantCourseDialogOpen(false);
      fetchData();
    } catch {
      toast.error('Erro ao conceder curso');
    }
    setGranting(false);
  };
  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.user_id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    student: 'Aluno',
  };

  const StudentActions = ({ student }: { student: Student }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={() => handleViewProfile(student)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToggleRole(student)}>
          {student.role === 'admin' ? (
            <><ShieldOff className="h-4 w-4 mr-2" />Tornar Aluno</>
          ) : (
            <><ShieldCheck className="h-4 w-4 mr-2" />Tornar Admin</>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleOpenGrantCourseDialog(student)}>
          <BookPlus className="h-4 w-4 mr-2" />
          Conceder Curso
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleOpenResetDialog(student)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetar Progresso
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleOpenDeleteDialog(student)} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir Usuário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground text-sm md:text-base">Gerencie os alunos da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleExportCSV} title="Exportar CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20"
          >
            <span className="text-sm font-medium">
              {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Exportar CSV
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Excluir
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <div className="space-y-1">
          {/* Select All */}
          <div className="flex items-center gap-3 px-3 py-2">
            <Checkbox
              checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">
              {filteredStudents.length} aluno{filteredStudents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Student List */}
          {filteredStudents.map((student, index) => {
            const isSelected = selectedIds.has(student.user_id);

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.5) }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary/5 border-primary/20' : 'bg-card border-transparent hover:bg-accent/50'
                }`}
                onClick={() => toggleSelect(student.user_id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(student.user_id)}
                  onClick={(e) => e.stopPropagation()}
                />

                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={student.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {student.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-medium text-sm truncate hover:underline cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleViewProfile(student); }}
                    >{student.full_name}</span>
                    <Badge
                      variant={student.role === 'admin' ? 'default' : 'secondary'}
                      className="text-xs px-1.5 py-0 h-5 shrink-0"
                    >
                      {roleLabels[student.role] || student.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{student.email || 'Sem email'}</p>
                </div>

                <div className="hidden md:flex items-center gap-6 shrink-0 text-sm text-muted-foreground">
                  <div className="text-center min-w-16">
                    <span className="font-medium text-foreground">{student.enrolledCourses}</span>
                    <span className="ml-1">cursos</span>
                  </div>
                  <div className="min-w-[120px] text-xs">
                    {formatDateTime(student.last_seen_at)}
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <StudentActions student={student} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

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
              <Input id="full_name" value={editForm.full_name} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={editForm.email} onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@exemplo.com" />
              {editForm.email !== editingStudent?.email && editForm.email && (
                <p className="text-xs text-muted-foreground">⚠️ Um email de confirmação será enviado para o novo endereço.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <PhoneInput value={editForm.phone} onChange={(value) => setEditForm(prev => ({ ...prev, phone: value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input id="birth_date" type="date" value={editForm.birth_date} onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar'}
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
              <p>Esta ação é <strong>irreversível</strong>. Todos os dados do usuário serão permanentemente excluídos.</p>
              <div className="pt-2">
                <Label htmlFor="confirm-delete">
                  Digite <strong>{deletingStudent?.full_name}</strong> para confirmar:
                </Label>
                <Input id="confirm-delete" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="Nome do usuário" className="mt-2" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} disabled={deleting || deleteConfirmation !== deletingStudent?.full_name} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Excluindo...</> : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Excluir {selectedIds.size} Usuário{selectedIds.size > 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>Esta ação é <strong>irreversível</strong>. Todos os dados dos {selectedIds.size} usuários selecionados serão permanentemente excluídos, incluindo perfis, matrículas, progresso e comentários.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Excluindo...</> : `Excluir ${selectedIds.size} Usuário${selectedIds.size > 1 ? 's' : ''}`}
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
                <input type="radio" id="reset-all" name="reset-type" checked={resetType === 'all'} onChange={() => setResetType('all')} className="h-4 w-4" />
                <Label htmlFor="reset-all" className="cursor-pointer flex-1">
                  <span className="font-medium">Reset Total</span>
                  <p className="text-sm text-muted-foreground">Remove todo o progresso do aluno em todos os cursos</p>
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <input type="radio" id="reset-course" name="reset-type" checked={resetType === 'course'} onChange={() => setResetType('course')} className="h-4 w-4 mt-1" />
                <Label htmlFor="reset-course" className="cursor-pointer flex-1">
                  <span className="font-medium">Reset por Curso</span>
                  <p className="text-sm text-muted-foreground">Remove o progresso apenas do curso selecionado</p>
                </Label>
              </div>
            </div>
            {resetType === 'course' && (
              <div className="pl-7">
                {enrolledCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Este aluno não está matriculado em nenhum curso.</p>
                ) : (
                  <Select value={resetCourseId} onValueChange={setResetCourseId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
                    <SelectContent>
                      {enrolledCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning-foreground">⚠️ Esta ação irá remover todas as aulas concluídas e o tempo de estudo registrado. Esta ação não pode ser desfeita.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleResetProgress} disabled={resetting || (resetType === 'course' && !resetCourseId)} variant="destructive">
              {resetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetando...</> : <><RotateCcw className="mr-2 h-4 w-4" />Resetar Progresso</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Grant Course Dialog */}
      <Dialog open={grantCourseDialogOpen} onOpenChange={setGrantCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookPlus className="h-5 w-5" />
              Conceder Curso
            </DialogTitle>
            <DialogDescription>
              Matricule {grantStudent?.full_name} em um curso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum curso publicado disponível.</p>
            ) : (
              <Select value={grantCourseId} onValueChange={setGrantCourseId}>
                <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantCourseDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGrantCourse} disabled={granting || !grantCourseId}>
              {granting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Matriculando...</> : 'Matricular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
    </div>
  );
}
