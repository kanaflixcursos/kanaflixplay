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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Eye, CreditCard, QrCode, FileText, User, Copy, RotateCcw, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
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
  failure_reason: string | null;
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

const calculateNetAmount = (amount: number, paymentMethod: string | null): number => {
  const gatewayFee = 70; // R$ 0,70 in cents
  switch (paymentMethod) {
    case 'pix':
      return amount - Math.round(amount * 0.79 / 100) - gatewayFee;
    case 'boleto':
      return amount - 279 - gatewayFee; // R$ 2,79 + gateway
    case 'credit_card':
      return amount - gatewayFee; // MDR is passed to customer
    default:
      return amount - gatewayFee;
  }
};

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
  const navigate = useNavigate();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundingOrder, setRefundingOrder] = useState<Sale | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState<Sale | null>(null);
  const [canceling, setCanceling] = useState(false);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado!');
  };

  const handleRefund = async (sale: Sale) => {
    setRefunding(true);
    try {
      // Create refund request
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Create support ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: sale.user_id,
          subject: `Reembolso - ${sale.course_title || 'Pedido'}`,
          message: `Solicitação de reembolso iniciada pelo administrador para o pedido ${sale.id.slice(0, 8)}.`,
          category: 'refund',
          priority: 'high',
        })
        .select('id')
        .single();

      if (ticketError) throw ticketError;

      // Create refund request linked to ticket
      const { error: refundError } = await supabase
        .from('refund_requests')
        .insert({
          order_id: sale.id,
          user_id: sale.user_id,
          reason: 'Reembolso iniciado pelo administrador',
          ticket_id: ticket.id,
        });

      if (refundError) throw refundError;

      toast.success('Solicitação de reembolso criada!');
      setSelectedSale(null);
      navigate(`/admin/suporte/${ticket.id}`);
    } catch (error: any) {
      console.error('Error creating refund:', error);
      toast.error(error.message || 'Erro ao criar solicitação de reembolso');
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
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sales.map((sale) => (
          <div key={sale.id} className="border rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Link
                to={`/admin/students/${sale.user_id}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0 flex-1"
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
              <Badge variant="outline" className={`text-xs px-2 py-0.5 shrink-0 ${statusColors[sale.status] || ''}`}>
                {statusLabels[sale.status] || sale.status}
              </Badge>
            </div>

            <p className="text-sm font-medium truncate">{sale.course_title || '—'}</p>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground text-sm">{formatCurrency(sale.amount)}</span>
                <span className="text-xs text-muted-foreground ml-1.5">
                  Líq. {formatCurrency(calculateNetAmount(sale.amount, sale.payment_method))}
                </span>
              </div>
              {sale.payment_method && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 gap-1">
                  {paymentMethodIcons[sale.payment_method]}
                  {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-xs text-muted-foreground">
                {format(new Date(sale.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
              </span>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedSale(sale)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {sale.status === 'paid' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-warning hover:text-warning hover:bg-warning/10">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-warning">
                          <RotateCcw className="h-5 w-5" />
                          Confirmar Reembolso
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>Você está prestes a iniciar o reembolso do pedido do curso <strong>{sale.course_title}</strong>.</p>
                          <p>Valor: <strong>{formatCurrency(sale.amount)}</strong></p>
                          <p className="text-muted-foreground">Um ticket de suporte será criado para acompanhar o processo.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={refunding}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRefund(sale)}
                          disabled={refunding}
                          className="bg-warning text-warning-foreground hover:bg-warning/90"
                        >
                          {refunding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                          Confirmar Reembolso
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {sale.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => { setCancelingOrder(sale); setCancelDialogOpen(true); }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6 hidden md:block">
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
                <TableCell className="text-sm whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{formatCurrency(sale.amount)}</span>
                    <span className="text-xs text-muted-foreground">
                      Líq. {formatCurrency(calculateNetAmount(sale.amount, sale.payment_method))}
                    </span>
                  </div>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                            title="Reembolsar"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-warning">
                              <RotateCcw className="h-5 w-5" />
                              Confirmar Reembolso
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>Você está prestes a iniciar o reembolso do pedido do curso <strong>{sale.course_title}</strong>.</p>
                              <p>Valor: <strong>{formatCurrency(sale.amount)}</strong></p>
                              <p className="text-muted-foreground">Um ticket de suporte será criado para acompanhar o processo.</p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={refunding}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRefund(sale)}
                              disabled={refunding}
                              className="bg-warning text-warning-foreground hover:bg-warning/90"
                            >
                              {refunding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                              Confirmar Reembolso
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

              {/* Failure Reason */}
              {selectedSale.status === 'failed' && selectedSale.failure_reason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                  <p className="text-destructive font-medium mb-1">Motivo da falha</p>
                  <p className="text-destructive/80 text-xs break-words">{selectedSale.failure_reason}</p>
                </div>
              )}

              {/* Action buttons in dialog */}
              {(selectedSale.status === 'paid' || selectedSale.status === 'pending') && (
                <div className="flex gap-2 pt-2 border-t">
                  {selectedSale.status === 'paid' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-warning border-warning/30 hover:bg-warning/10"
                          disabled={refunding}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reembolsar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-warning">
                            <RotateCcw className="h-5 w-5" />
                            Confirmar Reembolso
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>Você está prestes a iniciar o reembolso do pedido do curso <strong>{selectedSale.course_title}</strong>.</p>
                            <p>Valor: <strong>{formatCurrency(selectedSale.amount)}</strong></p>
                            <p className="text-muted-foreground">Um ticket de suporte será criado para acompanhar o processo.</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={refunding}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRefund(selectedSale)}
                            disabled={refunding}
                            className="bg-warning text-warning-foreground hover:bg-warning/90"
                          >
                            {refunding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                            Confirmar Reembolso
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
    .select('id, amount, status, payment_method, paid_at, created_at, course_id, user_id, pix_qr_code, boleto_url, failure_reason')
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
