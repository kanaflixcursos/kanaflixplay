import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft, Users, BookOpen, Clock, Search, AlertTriangle, Download, MoreHorizontal, UserX, Loader2,
} from 'lucide-react';
import { Edit } from 'react-iconly';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard';

interface CourseInfo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_published: boolean;
  price: number | null;
}

interface EnrolledStudent {
  enrollment_id: string;
  user_id: string;
  enrolled_at: string;
  expires_at: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  total_paid: number;
}

function getRemainingInfo(expiresAt: string | null) {
  if (!expiresAt) return { label: 'Vitalício', variant: 'default' as const, daysLeft: Infinity };
  const now = new Date();
  const expDate = new Date(expiresAt);
  const daysLeft = differenceInDays(expDate, now);

  if (daysLeft < 0) return { label: 'Expirado', variant: 'destructive' as const, daysLeft };
  if (daysLeft <= 30) return { label: `${daysLeft}d restantes`, variant: 'destructive' as const, daysLeft };
  if (daysLeft <= 90) return { label: `${daysLeft}d restantes`, variant: 'secondary' as const, daysLeft };

  const months = Math.floor(daysLeft / 30);
  return { label: `${months} ${months === 1 ? 'mês' : 'meses'} restantes`, variant: 'default' as const, daysLeft };
}

function getRemainingText(expiresAt: string | null) {
  if (!expiresAt) return 'Vitalício';
  const daysLeft = differenceInDays(new Date(expiresAt), new Date());
  if (daysLeft < 0) return 'Expirado';
  if (daysLeft <= 90) return `${daysLeft} dias`;
  return `${Math.floor(daysLeft / 30)} meses`;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokingStudent, setRevokingStudent] = useState<EnrolledStudent | null>(null);
  const [revoking, setRevoking] = useState(false);
  useEffect(() => {
    if (!courseId) return;
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    setLoading(true);

    const [{ data: courseData }, { data: enrollments }] = await Promise.all([
      supabase
        .from('courses')
        .select('id, title, thumbnail_url, is_published, price')
        .eq('id', courseId!)
        .single(),
      supabase
        .from('course_enrollments')
        .select('id, user_id, enrolled_at, expires_at')
        .eq('course_id', courseId!),
    ]);

    if (!courseData) {
      navigate('/admin/courses');
      return;
    }

    setCourse(courseData);

    if (enrollments && enrollments.length > 0) {
      const userIds = enrollments.map(e => e.user_id);

      const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds),
        supabase
          .from('orders')
          .select('user_id, amount, status, course_id')
          .eq('course_id', courseId!)
          .eq('status', 'paid')
          .in('user_id', userIds),
      ]);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const orderTotals = new Map<string, number>();
      (orders || []).forEach(o => {
        orderTotals.set(o.user_id, (orderTotals.get(o.user_id) || 0) + (o.amount || 0));
      });

      const enriched: EnrolledStudent[] = enrollments.map(e => {
        const profile = profileMap.get(e.user_id);
        return {
          enrollment_id: e.id,
          user_id: e.user_id,
          enrolled_at: e.enrolled_at,
          expires_at: e.expires_at,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          total_paid: orderTotals.get(e.user_id) || 0,
        };
      });

      setStudents(enriched);
    } else {
      setStudents([]);
    }

    setLoading(false);
  };

  const filteredStudents = useMemo(() =>
    students.filter(s => {
      const q = search.toLowerCase();
      return (s.full_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q);
    }),
    [students, search]
  );

  const activeStudents = useMemo(() =>
    students.filter(s => {
      if (!s.expires_at) return true;
      return new Date(s.expires_at) > new Date();
    }).length,
    [students]
  );

  const expiringStudents = useMemo(() =>
    students.filter(s => {
      if (!s.expires_at) return false;
      const daysLeft = differenceInDays(new Date(s.expires_at), new Date());
      return daysLeft >= 0 && daysLeft <= 30;
    }).length,
    [students]
  );

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatPrice = (price: number | null) => {
    if (!price || price <= 0) return 'Gratuito';
    return formatCurrency(price);
  };

  const handleRevokeAccess = async () => {
    if (!revokingStudent || !courseId) return;
    setRevoking(true);
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('id', revokingStudent.enrollment_id);

      if (error) throw error;
      toast.success(`Acesso de ${revokingStudent.full_name || 'aluno'} revogado com sucesso!`);
      setRevokeDialogOpen(false);
      setRevokingStudent(null);
      fetchData();
    } catch {
      toast.error('Erro ao revogar acesso');
    }
    setRevoking(false);
  };

  const handleExportCSV = () => {
    if (!filteredStudents.length || !course) return;
    const header = 'Nome,Email,Matriculado em,Tempo Restante,Valor Pago\n';
    const rows = filteredStudents.map(s =>
      `"${s.full_name || ''}","${s.email || ''}","${format(new Date(s.enrolled_at), 'dd/MM/yyyy')}","${getRemainingText(s.expires_at)}","${formatCurrency(s.total_paid)}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alunos-${course.title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/courses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-12 w-10 rounded object-cover shrink-0"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{course.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs">
                  {course.is_published ? 'Publicado' : 'Oculto'}
                </Badge>
                <span className="text-sm text-muted-foreground">{formatPrice(course.price)}</span>
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(`/admin/courses/${course.id}/edit`)} className="gap-1.5">
          <Edit size={16} />
          Editar Curso
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        <StatCard title="Total de Alunos" value={students.length} icon={Users} />
        <StatCard title="Acessos Ativos" value={activeStudents} icon={BookOpen} />
        <StatCard title="Expirando (30d)" value={expiringStudents} icon={AlertTriangle} />
      </motion.div>

      {/* Students Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
      >
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className="icon-box">
                  <Users className="h-4 w-4" />
                </div>
                Alunos Matriculados
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aluno..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={filteredStudents.length === 0}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Nenhum aluno matriculado neste curso</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Matriculado em</TableHead>
                    <TableHead>Tempo Restante</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const remaining = getRemainingInfo(student.expires_at);
                    return (
                      <TableRow
                        key={student.enrollment_id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/students/${student.user_id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(student.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">
                              {student.full_name || 'Sem nome'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.email || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(student.enrolled_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={remaining.variant === 'default' ? 'outline' : remaining.variant}
                            className={
                              remaining.variant === 'default'
                                ? 'bg-success/10 text-success border-success/30 text-xs'
                                : remaining.variant === 'secondary'
                                ? 'bg-warning/10 text-warning border-warning/30 text-xs'
                                : 'text-xs'
                            }
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {remaining.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {student.total_paid > 0 ? formatCurrency(student.total_paid) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}