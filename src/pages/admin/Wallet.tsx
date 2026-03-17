import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wallet as WalletIcon,
  Clock,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface WalletData {
  recipient: {
    id: string;
    name: string;
    status: string;
    type: string;
  };
  balance: {
    available_amount: number;
    waiting_funds_amount: number;
    transferred_amount: number;
  };
  payables: any[];
  operations: any[];
}

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valueInCents / 100);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
};

export default function AdminWallet() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletData | null>(null);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('pagarme', {
        body: { action: 'get_wallet' },
      });

      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);

      setData(result);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar carteira');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Carteira</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Não foi possível carregar os dados da carteira.</p>
            <Button variant="outline" className="mt-4" onClick={fetchWallet}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Aggregate payables by date
  const payablesByDate = data.payables.reduce<Record<string, { total: number; count: number }>>((acc, p) => {
    const date = p.payment_date ? format(new Date(p.payment_date), 'yyyy-MM-dd') : 'sem-data';
    if (!acc[date]) acc[date] = { total: 0, count: 0 };
    acc[date].total += p.amount || 0;
    acc[date].count += 1;
    return acc;
  }, {});

  const sortedPayableDates = Object.entries(payablesByDate).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Carteira</h1>
          <p className="text-muted-foreground">Saldo e recebíveis da Pagar.me</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWallet} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="icon-box">
                <WalletIcon />
              </div>
              <span className="stat-card-label leading-tight">Saldo Disponível</span>
            </div>
            <div className="stat-card-value">{formatCurrency(data.balance.available_amount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="icon-box">
                <Clock />
              </div>
              <span className="stat-card-label leading-tight">A Receber</span>
            </div>
            <div className="stat-card-value">{formatCurrency(data.balance.waiting_funds_amount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="icon-box">
                <ArrowUpRight />
              </div>
              <span className="stat-card-label leading-tight">Total Transferido</span>
            </div>
            <div className="stat-card-value">{formatCurrency(data.balance.transferred_amount)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Upcoming Payables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Recebíveis Futuros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedPayableDates.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum recebível pendente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedPayableDates.map(([date, info]) => (
                  <div key={date} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="icon-box-sm">
                        <Banknote />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {date === 'sem-data' ? 'Sem data' : formatDate(date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {info.count} {info.count === 1 ? 'recebível' : 'recebíveis'}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">{formatCurrency(info.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Movimentações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.operations.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpRight className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma movimentação recente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.operations.slice(0, 15).map((op: any, i: number) => {
                  const isPositive = (op.amount || 0) >= 0;
                  return (
                    <div key={op.id || i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <p className="text-sm font-medium">
                          {op.movement_object?.type || op.type || 'Operação'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {op.created_at ? formatDate(op.created_at) : '-'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={isPositive
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-destructive/10 text-destructive border-destructive/30'
                        }
                      >
                        {isPositive ? '+' : ''}{formatCurrency(op.amount || 0)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recipient Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Recebedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">ID:</span>{' '}
              <span className="font-mono text-xs">{data.recipient.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nome:</span>{' '}
              <span className="font-medium">{data.recipient.name || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{' '}
              <Badge variant="outline" className="ml-1">
                {data.recipient.status || '-'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
