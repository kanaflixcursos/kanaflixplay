import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RefundRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  order?: {
    id: string;
    amount: number;
    payment_method: string | null;
    paid_at: string | null;
    pagarme_charge_id: string | null;
    course?: {
      title: string;
      thumbnail_url: string | null;
    } | null;
  } | null;
}

interface RefundInfoBoxProps {
  refundRequest: RefundRequest;
  isAdmin: boolean;
  onStatusChange?: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: 'Aguardando Análise', variant: 'secondary', icon: Clock },
  approved: { label: 'Aprovado', variant: 'default', icon: CheckCircle2 },
  rejected: { label: 'Recusado', variant: 'destructive', icon: XCircle },
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX',
  boleto: 'Boleto',
};

export function RefundInfoBox({ refundRequest, isAdmin, onStatusChange }: RefundInfoBoxProps) {
  const [expanded, setExpanded] = useState(true);
  const [processing, setProcessing] = useState(false);

  const status = statusConfig[refundRequest.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const isPending = refundRequest.status === 'pending';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const handleReviewRefund = async (approved: boolean) => {
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('refund_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', refundRequest.id);

      if (updateError) throw updateError;

      if (approved && refundRequest.order?.pagarme_charge_id) {
        const { error: refundError } = await supabase.functions.invoke('pagarme', {
          body: {
            action: 'refund',
            chargeId: refundRequest.order.pagarme_charge_id,
            orderId: refundRequest.order_id,
          },
        });

        if (refundError) {
          toast.error('Reembolso aprovado, mas houve erro no processamento. Verifique manualmente.');
        } else {
          toast.success('Reembolso aprovado e processado com sucesso!');
        }
      } else if (approved) {
        toast.success('Reembolso aprovado! Processe manualmente no gateway de pagamento.');
      } else {
        toast.success('Solicitação de reembolso recusada');
      }

      onStatusChange?.();
    } catch (error) {
      console.error('Error reviewing refund:', error);
      toast.error('Erro ao processar solicitação');
    }

    setProcessing(false);
  };

  return (
    <div className="bg-gradient-to-br from-muted/80 to-muted/40 border rounded-xl overflow-hidden mb-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-sm">Solicitação de Reembolso</h3>
            <p className="text-xs text-muted-foreground">
              {refundRequest.order?.course?.title || 'Pedido'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-background/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Valor do Pedido</p>
              <p className="font-semibold text-lg">
                {refundRequest.order?.amount ? formatCurrency(refundRequest.order.amount) : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
              <p className="font-medium text-sm">
                {refundRequest.order?.payment_method 
                  ? paymentMethodLabels[refundRequest.order.payment_method] || refundRequest.order.payment_method
                  : '-'}
              </p>
            </div>
            {refundRequest.order?.paid_at && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Pago em</p>
                <p className="text-sm">
                  {format(new Date(refundRequest.order.paid_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="p-3 bg-background/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Motivo da Solicitação</p>
            <p className="text-sm whitespace-pre-wrap">{refundRequest.reason}</p>
          </div>

          {/* Admin Section */}
          {isAdmin && isPending && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleReviewRefund(false)}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Recusar
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleReviewRefund(true)}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Aprovar Reembolso
              </Button>
            </div>
          )}

          {/* Reviewed info */}
          {refundRequest.reviewed_at && (
            <p className="text-xs text-muted-foreground text-center">
              {refundRequest.status === 'approved' ? 'Aprovado' : 'Recusado'} em{' '}
              {format(new Date(refundRequest.reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
