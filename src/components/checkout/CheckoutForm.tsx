import { useState, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CreditCard, 
  QrCode, 
  Barcode, 
  Loader2, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Lock,
  Sparkles,
  Clock,
  Zap,
  AlertCircle,
  Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  price: number;
  thumbnail_url?: string | null;
}

interface CheckoutFormProps {
  course: Course;
  onSuccess?: () => void;
}

type PaymentMethod = 'credit_card' | 'pix' | 'boleto';

interface PaymentResult {
  pix?: {
    qrCode: string;
    qrCodeUrl: string;
    expiresAt: string;
  };
  boleto?: {
    url: string;
    barcode: string;
    dueDate: string;
  };
}

interface InstallmentOption {
  number: number;
  interest_rate: number;
  label: string;
}

interface PaymentConfig {
  payment_methods: Array<{
    id: string;
    name: string;
    enabled: boolean;
    discount_percentage?: number;
    installments?: {
      max: number;
      min_amount_per_installment: number;
      options: InstallmentOption[];
    };
  }>;
}

export function CheckoutForm({ course, onSuccess }: CheckoutFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  } | null>(null);

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    document: '',
    phone: ''
  });
  
  const [card, setCard] = useState({
    number: '',
    holderName: '',
    expMonth: '',
    expYear: '',
    cvv: ''
  });

  const [installments, setInstallments] = useState(1);

  // Fetch payment config on mount
  useEffect(() => {
    fetchPaymentConfig();
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('pagarme', {
        body: { action: 'get_payment_config' }
      });

      if (response.data) {
        setPaymentConfig(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Coupon validation
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('id, code, discount_type, discount_value, max_uses, used_count, course_id, course_ids, expires_at, is_active')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast.error('Cupom inválido ou não encontrado');
        setCouponLoading(false);
        return;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('Este cupom expirou');
        setCouponLoading(false);
        return;
      }

      // Check usage limit
      if (data.max_uses != null && data.used_count >= data.max_uses) {
        toast.error('Este cupom atingiu o limite de usos');
        setCouponLoading(false);
        return;
      }

      // Check course restriction (supports course_ids array and legacy course_id)
      const couponCourseIds: string[] = (data as any).course_ids?.length > 0
        ? (data as any).course_ids
        : (data.course_id ? [data.course_id] : []);
      
      if (couponCourseIds.length > 0 && !couponCourseIds.includes(course.id)) {
        toast.error('Este cupom não é válido para este curso');
        setCouponLoading(false);
        return;
      }

      setAppliedCoupon({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type as 'percentage' | 'fixed',
        discount_value: data.discount_value,
      });
      toast.success('Cupom aplicado!');
    } catch {
      toast.error('Erro ao validar cupom');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Calculate discounted price
  const discountedPrice = useMemo(() => {
    if (!appliedCoupon) return course.price;
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.max(0, Math.round(course.price * (1 - appliedCoupon.discount_value / 100)));
    }
    return Math.max(0, course.price - appliedCoupon.discount_value);
  }, [course.price, appliedCoupon]);


  // Calculate available installment options based on course price and config
  const availableInstallments = useMemo(() => {
    const creditCardConfig = paymentConfig?.payment_methods.find(m => m.id === 'credit_card');
    if (!creditCardConfig?.installments) {
      return [{ number: 1, interest_rate: 0, label: 'À vista', totalAmount: discountedPrice, installmentAmount: discountedPrice }];
    }

    const { options, min_amount_per_installment } = creditCardConfig.installments;
    
    return options
      .filter(opt => {
        const baseInstallmentAmount = discountedPrice / opt.number;
        return baseInstallmentAmount >= min_amount_per_installment;
      })
      .map(opt => {
        let totalAmount = discountedPrice;
        if (opt.interest_rate > 0) {
          totalAmount = Math.round(discountedPrice * (1 + opt.interest_rate / 100));
        }
        
        const installmentAmount = Math.ceil(totalAmount / opt.number);
        
        return {
          ...opt,
          totalAmount,
          installmentAmount
        };
      });
  }, [discountedPrice, paymentConfig]);

  // Get the selected installment details
  const selectedInstallment = useMemo(() => {
    return availableInstallments.find(opt => opt.number === installments) || availableInstallments[0];
  }, [availableInstallments, installments]);

  // Reset installments when switching payment methods
  useEffect(() => {
    if (paymentMethod !== 'credit_card') {
      setInstallments(1);
    }
  }, [paymentMethod]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleSubmit = async () => {
    if (!customer.name || !customer.email || !customer.document) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (paymentMethod === 'credit_card') {
      if (!card.number || !card.holderName || !card.expMonth || !card.expYear || !card.cvv) {
        toast.error('Preencha todos os dados do cartão');
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado para fazer uma compra');
        return;
      }

      const response = await supabase.functions.invoke('pagarme', {
        body: {
          action: 'create_order',
          courseId: course.id,
          paymentMethod,
          couponId: appliedCoupon?.id || undefined,
          customer: {
            name: customer.name,
            email: customer.email,
            document: customer.document.replace(/\D/g, ''),
            phone: customer.phone?.replace(/\D/g, '')
          },
          card: paymentMethod === 'credit_card' ? {
            number: card.number.replace(/\s/g, ''),
            holderName: card.holderName,
            expMonth: card.expMonth,
            expYear: card.expYear,
            cvv: card.cvv
          } : undefined,
          installments
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (!result.success) {
        const errorMsg = result.failureReason 
          ? `Pagamento não autorizado: ${result.failureReason}`
          : (result.error || 'Erro ao processar pagamento');
        throw new Error(errorMsg);
      }

      if (paymentMethod === 'credit_card' && result.order.status === 'paid') {
        toast.success('Pagamento aprovado! Você já pode acessar o curso.');
        onSuccess?.();
      } else if (paymentMethod === 'pix') {
        if (!result.pagarme?.pix?.qrCode || !result.pagarme?.pix?.qrCodeUrl) {
          throw new Error('Não foi possível gerar o QR Code PIX. O método de pagamento PIX pode não estar habilitado. Tente outro método de pagamento.');
        }
        setPaymentResult({ pix: result.pagarme.pix });
        toast.success('PIX gerado! Escaneie o QR Code para pagar.');
      } else if (paymentMethod === 'boleto') {
        if (!result.pagarme?.boleto?.url || !result.pagarme?.boleto?.barcode) {
          throw new Error('Não foi possível gerar o boleto. Tente outro método de pagamento.');
        }
        setPaymentResult({ boleto: result.pagarme.boleto });
        toast.success('Boleto gerado! Pague até a data de vencimento.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const paymentMethods = [
    { 
      method: 'pix' as const, 
      icon: QrCode, 
      label: 'PIX',
      badge: null,
      description: 'Aprovação imediata'
    },
    { 
      method: 'credit_card' as const, 
      icon: CreditCard, 
      label: 'Cartão',
      badge: 'até 12x',
      description: 'Parcelado'
    },
    { 
      method: 'boleto' as const, 
      icon: Barcode, 
      label: 'Boleto',
      badge: null,
      description: '3 dias úteis'
    },
  ];

  // Calculate amounts
  const finalAmount = paymentMethod === 'credit_card' 
    ? selectedInstallment?.totalAmount || discountedPrice
    : discountedPrice;

  if (paymentResult) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {paymentResult.pix && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-full text-sm font-medium">
                <Zap className="h-4 w-4" />
                PIX Gerado com Sucesso
              </div>
              
              <div className="bg-background p-6 rounded-2xl border-2 border-dashed border-primary/20 inline-block">
                <img 
                  src={paymentResult.pix.qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-52 h-52 mx-auto"
                />
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Ou copie o código PIX Copia e Cola:</p>
                <div className="flex gap-2">
                  <Input 
                    value={paymentResult.pix.qrCode} 
                    readOnly 
                    className="text-xs font-mono bg-muted/50"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="shrink-0"
                    onClick={() => copyToClipboard(paymentResult.pix!.qrCode)}
                  >
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg py-2 px-4">
                <Clock className="h-3.5 w-3.5" />
                Expira em: {new Date(paymentResult.pix.expiresAt).toLocaleString('pt-BR')}
              </div>
            </div>
          )}

          {paymentResult.boleto && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-full text-sm font-medium mb-6">
                  <Check className="h-4 w-4" />
                  Boleto Gerado com Sucesso
                </div>
                
                <Button asChild size="lg" className="w-full gap-2 h-12">
                  <a href={paymentResult.boleto.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Visualizar Boleto
                  </a>
                </Button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Código de barras:</p>
                <div className="flex gap-2">
                  <Input 
                    value={paymentResult.boleto.barcode} 
                    readOnly 
                    className="text-xs font-mono bg-muted/50"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="shrink-0"
                    onClick={() => copyToClipboard(paymentResult.boleto!.barcode)}
                  >
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg py-2 px-4">
                <Clock className="h-3.5 w-3.5" />
                Vencimento: {new Date(paymentResult.boleto.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Price Header */}
        <div className="p-6 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-b">
          <div className="space-y-2">
            {paymentMethod === 'credit_card' && selectedInstallment ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {selectedInstallment.number}x de {formatPrice(selectedInstallment.installmentAmount)}
                  </span>
                </div>
                {selectedInstallment.interest_rate > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Total: {formatPrice(selectedInstallment.totalAmount)} 
                      <span className="text-xs ml-1">
                        (taxa de {selectedInstallment.interest_rate}%)
                      </span>
                    </span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{formatPrice(discountedPrice)}</span>
                {appliedCoupon && discountedPrice < course.price && (
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(course.price)}</span>
                )}
              </div>
            )}
            {appliedCoupon && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Tag className="h-4 w-4" />
                <span>Cupom <strong>{appliedCoupon.code}</strong> aplicado — {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}% off` : `${formatPrice(appliedCoupon.discount_value)} off`}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-foreground">Forma de pagamento</h4>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(({ method, icon: Icon, label, badge, description }) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === method
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  {badge && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      method === 'pix' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {badge}
                    </span>
                  )}
                  <Icon className={`h-5 w-5 ${paymentMethod === method ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${paymentMethod === method ? 'text-primary' : 'text-foreground'}`}>
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Coupon Code */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground">Cupom de desconto</h4>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 p-3 bg-success/5 border border-success/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-success" />
                  <span className="font-mono font-bold">{appliedCoupon.code}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatPrice(appliedCoupon.discount_value)}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={removeCoupon}>
                  Remover
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Código do cupom"
                  className="h-10 font-mono bg-muted/30"
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-10"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                >
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Customer Data */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground">Seus dados</h4>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">Nome completo *</Label>
                <Input
                  id="name"
                  value={customer.name}
                  onChange={(e) => setCustomer(c => ({ ...c, name: e.target.value }))}
                  placeholder="Seu nome completo"
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer(c => ({ ...c, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="document" className="text-xs text-muted-foreground">CPF/CNPJ *</Label>
                  <Input
                    id="document"
                    value={customer.document}
                    onChange={(e) => setCustomer(c => ({ ...c, document: formatDocument(e.target.value) }))}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    className="h-11 bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs text-muted-foreground">Telefone</Label>
                  <Input
                    id="phone"
                    value={customer.phone}
                    onChange={(e) => setCustomer(c => ({ ...c, phone: formatPhone(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-11 bg-muted/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Details */}
          {paymentMethod === 'pix' && (
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Pagamento instantâneo</p>
                <p className="text-xs text-muted-foreground">
                  Um QR Code será gerado para você pagar pelo app do seu banco
                </p>
              </div>
            </div>
          )}

          {paymentMethod === 'credit_card' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cardNumber" className="text-xs text-muted-foreground">Número do cartão</Label>
                <Input
                  id="cardNumber"
                  value={card.number}
                  onChange={(e) => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holderName" className="text-xs text-muted-foreground">Nome no cartão</Label>
                <Input
                  id="holderName"
                  value={card.holderName}
                  onChange={(e) => setCard(c => ({ ...c, holderName: e.target.value.toUpperCase() }))}
                  placeholder="NOME COMO ESTÁ NO CARTÃO"
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expMonth" className="text-xs text-muted-foreground">Mês</Label>
                  <Input
                    id="expMonth"
                    value={card.expMonth}
                    onChange={(e) => setCard(c => ({ ...c, expMonth: e.target.value.replace(/\D/g, '') }))}
                    placeholder="MM"
                    maxLength={2}
                    className="h-11 text-center bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expYear" className="text-xs text-muted-foreground">Ano</Label>
                  <Input
                    id="expYear"
                    value={card.expYear}
                    onChange={(e) => setCard(c => ({ ...c, expYear: e.target.value.replace(/\D/g, '') }))}
                    placeholder="AA"
                    maxLength={2}
                    className="h-11 text-center bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvv" className="text-xs text-muted-foreground">CVV</Label>
                  <Input
                    id="cvv"
                    type="password"
                    value={card.cvv}
                    onChange={(e) => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '') }))}
                    placeholder="***"
                    maxLength={4}
                    className="h-11 text-center bg-muted/30"
                  />
                </div>
              </div>
              
              {/* Installments */}
              {availableInstallments.length >= 1 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Parcelas</Label>
                  <Select
                    value={installments.toString()}
                    onValueChange={(v) => setInstallments(parseInt(v))}
                  >
                    <SelectTrigger className="h-11 bg-muted/30">
                      <SelectValue placeholder="Selecione as parcelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInstallments.map((opt) => (
                        <SelectItem key={opt.number} value={opt.number.toString()}>
                          {opt.number}x de {formatPrice(opt.installmentAmount)}
                          {opt.interest_rate === 0 ? ' (sem juros)' : ` (+${opt.interest_rate}% — Total: ${formatPrice(opt.totalAmount)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'boleto' && (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-dashed">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Boleto Bancário</p>
                <p className="text-xs text-muted-foreground">
                  Vencimento em 3 dias úteis. Acesso liberado após compensação
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-background/80 space-y-4">
          <Button 
            onClick={handleSubmit} 
            className="w-full h-12 text-base gap-2 shadow-lg" 
            disabled={loading || loadingConfig}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pagar Agora
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span>Pagamento 100% seguro</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
