import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { ShoppingCart, Eye, CreditCard, QrCode, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Sale {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  course_id: string | null;
  user_id: string;
  course_title: string | null;
  user_name: string | null;
  user_email: string | null;
  pix_qr_code: string | null;
  boleto_url: string | null;
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  credit_card: <CreditCard className="h-3.5 w-3.5" />,
  pix: <QrCode className="h-3.5 w-3.5" />,
  boleto: <FileText className="h-3.5 w-3.5" />,
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'Cartão',
  pix: 'PIX',
  boleto: 'Boleto',
};

const statusColors: Record<string, string> = {
  paid: 'bg-success/20 text-success border-success/30',
  pending: 'bg-warning/20 text-warning border-warning/30',
  failed: 'bg-destructive/20 text-destructive border-destructive/30',
  canceled: 'bg-muted text-muted-foreground border-muted-foreground/30',
  refunded: 'bg-muted text-muted-foreground border-muted-foreground/30',
};

const statusLabels: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const PAGE_SIZE = 20;

export default function DashboardSalesTable() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    fetchSales();
  }, [page]);

  const fetchSales = async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    setTotalCount(count || 0);

    const { data: orders } = await supabase
      .from('orders')
      .select('id, amount, status, payment_method, paid_at, created_at, course_id, user_id, pix_qr_code, boleto_url')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (orders && orders.length > 0) {
      const courseIds = [...new Set(orders.map(o => o.course_id).filter(Boolean))] as string[];
      const userIds = [...new Set(orders.map(o => o.user_id))];

      const [{ data: courses }, { data: profiles }] = await Promise.all([
        courseIds.length > 0
          ? supabase.from('courses').select('id, title').in('id', courseIds)
          : Promise.resolve({ data: [] as { id: string; title: string }[] }),
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds),
      ]);

      const coursesMap = new Map(courses?.map(c => [c.id, c.title]) || []);
      const profilesMap = new Map(profiles?.map(p => [p.user_id, { name: p.full_name, email: p.email }]) || []);

      setSales(orders.map(o => ({
        ...o,
        course_title: o.course_id ? (coursesMap.get(o.course_id) || null) : null,
        user_name: profilesMap.get(o.user_id)?.name || null,
        user_email: profilesMap.get(o.user_id)?.email || null,
      })));
    } else {
      setSales([]);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-left">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Lista de Vendas</span>
          </CardTitle>
          <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm h-8" asChild>
            <Link to="/admin/orders">Todas as Vendas</Link>
          </Button>
        </CardHeader>
        <CardContent className="dashboard-card-content">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda realizada</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">ID do Pedido</TableHead>
                      <TableHead className="text-xs">Aluno</TableHead>
                      <TableHead className="text-xs">Nome do Curso</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">Pagamento</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-xs font-mono max-w-[120px] truncate">
                          {sale.id.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate">
                          <Link
                            to={`/admin/students/${sale.user_id}`}
                            className="text-primary hover:underline"
                          >
                            {sale.user_name || sale.user_email || 'Usuário'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate">
                          {sale.course_title || '—'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-success whitespace-nowrap">
                          {formatCurrency(sale.amount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {sale.payment_method ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                              {paymentMethodIcons[sale.payment_method]}
                              {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${statusColors[sale.status] || ''}`}>
                            {statusLabels[sale.status] || sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(sale.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedSale(sale)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      {page > 0 && (
                        <PaginationItem>
                          <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(p => p - 1); }} />
                        </PaginationItem>
                      )}
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                        const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                        const pageNum = start + i;
                        if (pageNum >= totalPages) return null;
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              isActive={pageNum === page}
                              onClick={(e) => { e.preventDefault(); setPage(pageNum); }}
                            >
                              {pageNum + 1}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      {page < totalPages - 1 && (
                        <PaginationItem>
                          <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(p => p + 1); }} />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Curso</p>
                  <p className="font-medium">{selectedSale.course_title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-medium text-success">{formatCurrency(selectedSale.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Comprador</p>
                  <p className="font-medium">{selectedSale.user_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{selectedSale.user_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagamento</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    {selectedSale.payment_method && paymentMethodIcons[selectedSale.payment_method]}
                    {selectedSale.payment_method
                      ? paymentMethodLabels[selectedSale.payment_method] || selectedSale.payment_method
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusColors[selectedSale.status] || ''}>
                    {statusLabels[selectedSale.status] || selectedSale.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">{format(new Date(selectedSale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                {selectedSale.paid_at && (
                  <div>
                    <p className="text-muted-foreground">Pago em</p>
                    <p className="font-medium">{format(new Date(selectedSale.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">ID: {selectedSale.id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
