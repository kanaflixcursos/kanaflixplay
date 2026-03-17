import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet as WalletIcon,
  Clock,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  Banknote,
  Info,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface WalletData {
  recipient: {
    id: string;
    name: string;
    status: string;
    type: string;
  };
  bank_account: {
    bank: string;
    bank_name: string | null;
    branch_number: string;
    branch_check_digit: string | null;
    account_number: string;
    account_check_digit: string | null;
    type: string;
    holder_name: string;
    holder_document: string;
  } | null;
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

const maskDocument = (doc: string) => {
  if (!doc) return '-';
  if (doc.length === 11) return `***.***.${doc.slice(6, 9)}-**`;
  if (doc.length === 14) return `**.***.${doc.slice(5, 8)}/${doc.slice(8, 12)}-**`;
  return doc;
};

const accountTypeLabels: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Conta Poupança',
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

function BalanceSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

function InfoSkeleton() {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-5 w-32" />
      ))}
    </div>
  );
}

export default function AdminWallet() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

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
    setRefreshing(false);
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  // Aggregate payables by date
  const payablesByDate = data?.payables.reduce<Record<string, { total: number; count: number }>>((acc, p) => {
    const date = p.payment_date ? format(new Date(p.payment_date), 'yyyy-MM-dd') : 'sem-data';
    if (!acc[date]) acc[date] = { total: 0, count: 0 };
    acc[date].total += p.amount || 0;
    acc[date].count += 1;
    return acc;
  }, {}) || {};

  const sortedPayableDates = Object.entries(payablesByDate).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Carteira</h1>
          <p className="text-muted-foreground">Saldo e recebíveis da Pagar.me</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchWallet(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </motion.div>

      {/* Balance Cards */}
      {loading ? (
        <BalanceSkeleton />
      ) : data ? (
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="grid gap-3 sm:grid-cols-3">
          <Card className="overflow-hidden stat-card-mesh">
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

          <Card className="overflow-hidden stat-card-mesh">
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
        </motion.div>
      ) : null}

      {/* Payables + Operations */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="grid gap-3 lg:grid-cols-2">
        {/* Upcoming Payables */}
        <Card className="overflow-hidden h-full">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-3">
              <div className="icon-box">
                <CalendarDays />
              </div>
              <span className="stat-card-label">Recebíveis Futuros</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <ListSkeleton />
            ) : sortedPayableDates.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum recebível pendente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedPayableDates.map(([date, info]) => (
                  <div key={date} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
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
        <Card className="overflow-hidden h-full">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-3">
              <div className="icon-box">
                <TrendingUp />
              </div>
              <span className="stat-card-label">Movimentações Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <ListSkeleton />
            ) : !data || data.operations.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpRight className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma movimentação recente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.operations.slice(0, 15).map((op: any, i: number) => {
                  const isPositive = (op.amount || 0) >= 0;
                  return (
                    <div key={op.id || i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
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
      </motion.div>

      {/* Bank Account + Recipient Info */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="grid gap-3 lg:grid-cols-2">
        {/* Bank Account */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-3">
              <div className="icon-box">
                <Landmark />
              </div>
              <span className="stat-card-label">Conta Bancária</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <InfoSkeleton />
            ) : data?.bank_account ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Banco</p>
                    <p className="font-medium">
                      {data.bank_account.bank_name
                        ? `${data.bank_account.bank} - ${data.bank_account.bank_name}`
                        : data.bank_account.bank}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Tipo</p>
                    <p className="font-medium">{accountTypeLabels[data.bank_account.type] || data.bank_account.type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Agência</p>
                    <p className="font-medium font-mono">
                      {data.bank_account.branch_number}
                      {data.bank_account.branch_check_digit ? `-${data.bank_account.branch_check_digit}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Conta</p>
                    <p className="font-medium font-mono">
                      {data.bank_account.account_number}
                      {data.bank_account.account_check_digit ? `-${data.bank_account.account_check_digit}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Titular</p>
                    <p className="font-medium">{data.bank_account.holder_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Documento</p>
                    <p className="font-medium font-mono">{maskDocument(data.bank_account.holder_document)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma conta bancária cadastrada</p>
            )}
          </CardContent>
        </Card>

        {/* Recipient Info */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-3">
              <div className="icon-box">
                <Info />
              </div>
              <span className="stat-card-label">Informações do Recebedor</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <InfoSkeleton />
            ) : data ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">ID</p>
                    <p className="font-mono text-xs">{data.recipient.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Nome</p>
                    <p className="font-medium">{data.recipient.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                    <Badge variant="outline">{data.recipient.status || '-'}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Tipo</p>
                    <p className="font-medium">{data.recipient.type || '-'}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
