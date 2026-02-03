import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Loader2, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  BookOpen,
  CreditCard,
  QrCode,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Hourglass
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentData {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  created_at: string;
  last_seen_at: string | null;
  role: string;
}

interface Order {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  course_id: string | null;
  course_title: string | null;
}

interface Enrollment {
  id: string;
  course_id: string;
  course_title: string;
  enrolled_at: string;
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  credit_card: <CreditCard className="h-4 w-4" />,
  pix: <QrCode className="h-4 w-4" />,
  boleto: <FileText className="h-4 w-4" />,
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX',
  boleto: 'Boleto Bancário',
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  paid: { 
    label: 'Aprovado', 
    icon: <CheckCircle className="h-4 w-4" />, 
    className: 'bg-success/20 text-success border-success/30' 
  },
  pending: { 
    label: 'Pendente', 
    icon: <Hourglass className="h-4 w-4" />, 
    className: 'bg-warning/20 text-warning border-warning/30' 
  },
  failed: { 
    label: 'Falhou', 
    icon: <AlertCircle className="h-4 w-4" />, 
    className: 'bg-destructive/20 text-destructive border-destructive/30' 
  },
  canceled: { 
    label: 'Cancelado', 
    icon: <XCircle className="h-4 w-4" />, 
    className: 'bg-muted text-muted-foreground border-muted-foreground/30' 
  },
  refunded: { 
    label: 'Reembolsado', 
    icon: <RotateCcw className="h-4 w-4" />, 
    className: 'bg-warning/20 text-warning border-warning/30' 
  },
  chargedback: { 
    label: 'Estornado', 
    icon: <RotateCcw className="h-4 w-4" />, 
    className: 'bg-destructive/20 text-destructive border-destructive/30' 
  },
};

export default function StudentProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    if (userId) {
      fetchStudentData();
    }
  }, [userId]);

  const fetchStudentData = async () => {
    if (!userId) return;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      navigate('/admin/students');
      return;
    }

    // Fetch role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    setStudent({
      ...profile,
      role: roleData?.role || 'student',
    });

    // Fetch orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, amount, status, payment_method, paid_at, created_at, course_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersData && ordersData.length > 0) {
      const courseIds = [...new Set(ordersData.map(o => o.course_id).filter(Boolean))];
      const { data: courses } = courseIds.length > 0
        ? await supabase.from('courses').select('id, title').in('id', courseIds)
        : { data: [] };

      const coursesMap = new Map<string, string>();
      courses?.forEach(c => coursesMap.set(c.id, c.title));

      setOrders(
        ordersData.map(o => ({
          ...o,
          course_title: o.course_id ? (coursesMap.get(o.course_id) || null) : null,
        }))
      );
    }

    // Fetch enrollments
    const { data: enrollmentsData } = await supabase
      .from('course_enrollments')
      .select('id, course_id, enrolled_at')
      .eq('user_id', userId);

    if (enrollmentsData && enrollmentsData.length > 0) {
      const courseIds = enrollmentsData.map(e => e.course_id);
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);

      const coursesMap = new Map<string, string>();
      courses?.forEach(c => coursesMap.set(c.id, c.title));

      setEnrollments(
        enrollmentsData.map(e => ({
          ...e,
          course_title: coursesMap.get(e.course_id) || 'Curso não encontrado',
        }))
      );
    }

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/students')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Perfil do Aluno</h1>
          <p className="text-muted-foreground">Visualize informações e histórico de compras</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar and Name */}
            <div className="flex flex-col items-center text-center">
              {student.avatar_url ? (
                <img 
                  src={student.avatar_url} 
                  alt={student.full_name || 'Avatar'}
                  className="w-24 h-24 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-3xl font-medium">
                    {(student.full_name || 'U').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-semibold">{student.full_name || 'Sem nome'}</h2>
              <Badge variant={student.role === 'admin' ? 'default' : 'secondary'} className="mt-2">
                {student.role === 'admin' ? 'Administrador' : 'Aluno'}
              </Badge>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{student.email || '-'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{student.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">Nascimento: {formatDate(student.birth_date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">Último acesso: {formatDateTime(student.last_seen_at)}</span>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{enrollments.length} curso(s) matriculado(s)</span>
              </div>
            </div>

            <Separator />

            {/* Enrolled Courses */}
            {enrollments.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Cursos Matriculados</h3>
                <div className="space-y-2">
                  {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium">{enrollment.course_title}</p>
                      <p className="text-xs text-muted-foreground">
                        Matriculado em {formatDate(enrollment.enrolled_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Histórico de Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma compra realizada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const status = statusConfig[order.status] || {
                    label: order.status,
                    icon: <AlertCircle className="h-4 w-4" />,
                    className: 'bg-muted text-muted-foreground',
                  };

                  return (
                    <div 
                      key={order.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {order.course_title || 'Curso não identificado'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {order.payment_method && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                {paymentMethodIcons[order.payment_method]}
                                <span>{paymentMethodLabels[order.payment_method] || order.payment_method}</span>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(order.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-lg">
                            {formatCurrency(order.amount)}
                          </span>
                          <Badge variant="outline" className={`${status.className} flex items-center gap-1.5`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Additional info based on status */}
                      {order.status === 'paid' && order.paid_at && (
                        <p className="text-xs text-success mt-2">
                          ✓ Pagamento confirmado em {formatDateTime(order.paid_at)}
                        </p>
                      )}
                      {order.status === 'pending' && (
                        <p className="text-xs text-warning mt-2">
                          ⏳ Aguardando confirmação do pagamento
                        </p>
                      )}
                      {order.status === 'failed' && (
                        <p className="text-xs text-destructive mt-2">
                          ✗ Pagamento não aprovado pela operadora
                        </p>
                      )}
                      {order.status === 'refunded' && (
                        <p className="text-xs text-warning mt-2">
                          ↩ Valor devolvido ao cliente
                        </p>
                      )}
                      {order.status === 'chargedback' && (
                        <p className="text-xs text-destructive mt-2">
                          ⚠ Contestação de pagamento (chargeback)
                        </p>
                      )}
                      {order.status === 'canceled' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Pedido cancelado
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
