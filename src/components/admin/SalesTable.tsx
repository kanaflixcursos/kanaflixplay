import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Eye, CreditCard, QrCode, FileText, User, Copy, RotateCcw, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export interface Sale {
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
  user_avatar: string | null;
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
  chargedback: 'bg-destructive/20 text-destructive border-destructive/30',
};

const statusLabels: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
  chargedback: 'Estornado',
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

interface SalesTableProps {
  sales: Sale[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPagination?: boolean;
  onRefresh?: () => void;
}

export default function SalesTable({
  sales,
  loading,
  page,
  totalPages,
  onPageChange,
  showPagination = true,
  onRefresh,
}: SalesTableProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundingOrder, setRefundingOrder] = useState<Sale | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState<Sale | null>(null);
  const [canceling, setCanceling] = useState(false);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado!');
  };

  const handleRefund = async () => {
    if (!refundingOrder) return;
    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke('pagarme', {
        body: { action: 'refund_order', orderId: refundingOrder.id }
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Reembolso processado com sucesso!');
      setRefundDialogOpen(false);
      setSelectedSale(null);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar reembolso');
    }
    setRefunding(false);
  };

  const handleCancel = async () => {
    if (!cancelingOrder) return;
    setCanceling(true);
    try {
      const { data, error } = await supabase.functions.invoke('pagarme', {
        body: { action: 'cancel_order', orderId: cancelingOrder.id }
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Pedido cancelado com sucesso!');
      setCancelDialogOpen(false);
      setSelectedSale(null);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar pedido');
    }
    setCanceling(false);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda realizada</p>;
  }

  return (
    <>
      <div className="overflow-x-auto -mx-4 sm:-mx-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-sm pl-4 sm:pl-6">ID do Pedido</TableHead>
              <TableHead className="text-sm">Aluno</TableHead>
              <TableHead className="text-sm">Nome do Curso</TableHead>
              <TableHead className="text-sm">Valor</TableHead>
              <TableHead className="text-sm">Pagamento</TableHead>
              <TableHead className="text-sm">Status</TableHead>
              <TableHead className="text-sm">Data</TableHead>
              <TableHead className="text-sm w-[100px] pr-4 sm:pr-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="pl-4 sm:pl-6">
                  <button
                    onClick={() => copyId(sale.id)}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5 group"
                    title="Clique para copiar o ID completo"
                  >
                    {sale.id.slice(0, 8)}…
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </TableCell>
                <TableCell className="text-sm">
                  <Link
                    to={`/admin/students/${sale.user_id}`}
                    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity max-w-[180px]"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={sale.user_avatar || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-primary truncate text-sm">
                      {sale.user_name || sale.user_email || 'Usuário'}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">
                  {sale.course_title || '—'}
                </TableCell>
                <TableCell className="text-sm font-semibold text-success whitespace-nowrap">
                  {formatCurrency(sale.amount)}
                </TableCell>
                <TableCell className="text-sm">
                  {sale.payment_method ? (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 gap-1">
                      {paymentMethodIcons[sale.payment_method]}
                      {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                    </Badge>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${statusColors[sale.status] || ''}`}>
                    {statusLabels[sale.status] || sale.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(sale.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                </TableCell>
                <TableCell className="pr-4 sm:pr-6">
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSale(sale)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {sale.status === 'paid' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                        onClick={() => { setRefundingOrder(sale); setRefundDialogOpen(true); }}
                        title="Reembolsar"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    {sale.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { setCancelingOrder(sale); setCancelDialogOpen(true); }}
                        title="Cancelar"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="mt-4 pt-4 border-t">
          <Pagination>
            <PaginationContent>
              {page > 0 && (
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); onPageChange(page - 1); }} />
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
                      onClick={(e) => { e.preventDefault(); onPageChange(pageNum); }}
                    >
                      {pageNum + 1}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {page < totalPages - 1 && (
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); onPageChange(page + 1); }} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Details Dialog */}
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

              {/* Action buttons in dialog */}
              {(selectedSale.status === 'paid' || selectedSale.status === 'pending') && (
                <div className="flex gap-2 pt-2 border-t">
                  {selectedSale.status === 'paid' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-warning border-warning/30 hover:bg-warning/10"
                      onClick={() => {
                        const sale = selectedSale;
                        setSelectedSale(null);
                        setRefundingOrder(sale);
                        setRefundDialogOpen(true);
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reembolsar
                    </Button>
                  )}
                  {selectedSale.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => {
                        const sale = selectedSale;
                        setSelectedSale(null);
                        setCancelingOrder(sale);
                        setCancelDialogOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar Pedido
                    </Button>
                  )}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">ID: {selectedSale.id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <RotateCcw className="h-5 w-5" />
              Confirmar Reembolso
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a reembolsar o pedido do curso <strong>{refundingOrder?.course_title}</strong>.</p>
              <p>Valor: <strong>{refundingOrder ? formatCurrency(refundingOrder.amount) : ''}</strong></p>
              <p className="text-destructive">Esta ação irá devolver o valor ao cliente e revogar o acesso ao curso.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refunding}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} disabled={refunding} className="bg-warning text-warning-foreground hover:bg-warning/90">
              {refunding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : 'Confirmar Reembolso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancelar Pedido
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a cancelar o pedido pendente do curso <strong>{cancelingOrder?.course_title}</strong>.</p>
              <p>Valor: <strong>{cancelingOrder ? formatCurrency(cancelingOrder.amount) : ''}</strong></p>
              <p className="text-muted-foreground">O pagamento via {cancelingOrder?.payment_method === 'pix' ? 'PIX' : 'Boleto'} não será mais aceito.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={canceling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {canceling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelando...</> : 'Confirmar Cancelamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Shared fetch helper
export async function fetchSalesData(page: number, pageSize: number): Promise<{ sales: Sale[]; totalCount: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const { data: orders } = await supabase
    .from('orders')
    .select('id, amount, status, payment_method, paid_at, created_at, course_id, user_id, pix_qr_code, boleto_url')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (!orders || orders.length === 0) {
    return { sales: [], totalCount: count || 0 };
  }

  const courseIds = [...new Set(orders.map(o => o.course_id).filter(Boolean))] as string[];
  const userIds = [...new Set(orders.map(o => o.user_id))];

  const [{ data: courses }, { data: profiles }] = await Promise.all([
    courseIds.length > 0
      ? supabase.from('courses').select('id, title').in('id', courseIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    supabase.from('profiles').select('user_id, full_name, email, avatar_url').in('user_id', userIds),
  ]);

  const coursesMap = new Map(courses?.map(c => [c.id, c.title]) || []);
  const profilesMap = new Map(profiles?.map(p => [p.user_id, { name: p.full_name, email: p.email, avatar: p.avatar_url }]) || []);

  const sales = orders.map(o => ({
    ...o,
    course_title: o.course_id ? (coursesMap.get(o.course_id) || null) : null,
    user_name: profilesMap.get(o.user_id)?.name || null,
    user_email: profilesMap.get(o.user_id)?.email || null,
    user_avatar: profilesMap.get(o.user_id)?.avatar || null,
  }));

  return { sales, totalCount: count || 0 };
}
