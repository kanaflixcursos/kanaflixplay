import { useState, useEffect, useMemo, useRef } from "react";
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
  CreditCard, QrCode, Barcode, Loader2, Copy, Check, ExternalLink, 
  ShieldCheck, Lock, Sparkles, Clock, Zap, AlertCircle, Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  formatPriceBRL, formatDocument, formatCardNumber, cleanCardNumber,
  formatPhone, formatCep, isValidDocument,
} from "@/utils/paymentFormatter";
import { calculateInstallments, formatCurrency, type InstallmentOption } from "@/utils/pricingCalculator";

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
  pix?: { qrCode: string; qrCodeUrl: string; expiresAt: string };
  boleto?: { url: string; barcode: string; dueDate: string };
}

interface LocalInstallmentOption {
  number: number;
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
  
  // Double-submit guard
  const submittingRef = useRef(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    payment_methods?: string[];
  } | null>(null);

  const [customer, setCustomer] = useState({
    name: '', email: '', document: '', phone: ''
  });

  const [address, setAddress] = useState({
    zipCode: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: ''
  });

  const [loadingCep, setLoadingCep] = useState(false);
  
  const [card, setCard] = useState({
    number: '', holderName: '', expMonth: '', expYear: '', cvv: ''
  });

  const [installments, setInstallments] = useState(1);

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
      if (response.data) setPaymentConfig(response.data);
    } catch {
      // Non-critical
    } finally {
      setLoadingConfig(false);
    }
  };

  // ─── Coupon ─────────────────────────────────────────────────────

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('id, code, discount_type, discount_value, max_uses, used_count, course_id, course_ids, expires_at, is_active, payment_methods')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast.error('Cupom inválido ou não encontrado');
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('Este cupom expirou');
        return;
      }
      if (data.max_uses != null && data.used_count >= data.max_uses) {
        toast.error('Este cupom atingiu o limite de usos');
        return;
      }

      const couponCourseIds: string[] = (data as any).course_ids?.length > 0
        ? (data as any).course_ids
        : (data.course_id ? [data.course_id] : []);
      
      if (couponCourseIds.length > 0 && !couponCourseIds.includes(course.id)) {
        toast.error('Este cupom não é válido para este curso');
        return;
      }

      const couponPaymentMethods: string[] = (data as any).payment_methods || [];
      
      setAppliedCoupon({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type as 'percentage' | 'fixed',
        discount_value: data.discount_value,
        payment_methods: couponPaymentMethods.length > 0 ? couponPaymentMethods : undefined,
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

  // ─── Display-only price hints (server is authoritative) ─────────

  const displayBasePrice = course.price;

  const displayCouponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.round(displayBasePrice * appliedCoupon.discount_value / 100);
    }
    return Math.min(appliedCoupon.discount_value, displayBasePrice);
  }, [displayBasePrice, appliedCoupon]);

  const displayPriceAfterCoupon = displayBasePrice - displayCouponDiscount;

  const displayPixDiscount = paymentMethod === 'pix'
    ? Math.round(displayPriceAfterCoupon * 3 / 100)
    : 0;

  const displayFinalPrice = displayPriceAfterCoupon - displayPixDiscount;

  // ─── Installment options using pricingCalculator ─────────────────

  const installmentOptions = useMemo(() => {
    return calculateInstallments(displayPriceAfterCoupon / 100);
  }, [displayPriceAfterCoupon]);

  const selectedInstallment = useMemo(() => {
    return installmentOptions.find(opt => opt.installments === installments) || installmentOptions[0];
  }, [installmentOptions, installments]);

  useEffect(() => {
    if (paymentMethod !== 'credit_card') setInstallments(1);
  }, [paymentMethod]);

  // ─── Coupon payment restriction ─────────────────────────────────

  const couponAllowedMethods = appliedCoupon?.payment_methods && appliedCoupon.payment_methods.length > 0
    ? appliedCoupon.payment_methods : null;

  useEffect(() => {
    if (couponAllowedMethods && !couponAllowedMethods.includes(paymentMethod)) {
      setPaymentMethod(couponAllowedMethods[0] as PaymentMethod);
    }
  }, [couponAllowedMethods]);

  const isMethodDisabled = (method: PaymentMethod) => {
    return couponAllowedMethods ? !couponAllowedMethods.includes(method) : false;
  };

  // ─── CEP auto-fill ──────────────────────────────────────────────

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(a => ({
          ...a,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      }
    } catch {
      // silently fail
    } finally {
      setLoadingCep(false);
    }
  };

  // ─── Submit ─────────────────────────────────────────────────────

  const handleSubmit = async () => {
    // Double-submit guard
    if (submittingRef.current) return;

    if (!customer.name.trim() || !customer.email.trim() || !customer.document.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!isValidDocument(customer.document)) {
      toast.error('CPF/CNPJ inválido');
      return;
    }

    if (!address.zipCode || !address.street || !address.number || !address.neighborhood || !address.city || !address.state) {
      toast.error('Preencha todos os campos de endereço obrigatórios');
      return;
    }

    if (paymentMethod === 'credit_card') {
      if (!card.number || !card.holderName || !card.expMonth || !card.expYear || !card.cvv) {
        toast.error('Preencha todos os dados do cartão');
        return;
      }
    }

    submittingRef.current = true;
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
            phone: customer.phone?.replace(/\D/g, ''),
            address: {
              zipCode: address.zipCode.replace(/\D/g, ''),
              street: address.street,
              number: address.number,
              complement: address.complement,
              neighborhood: address.neighborhood,
              city: address.city,
              state: address.state,
            }
          },
          card: paymentMethod === 'credit_card' ? {
            number: cleanCardNumber(card.number),
            holderName: card.holderName,
            expMonth: card.expMonth,
            expYear: card.expYear,
            cvv: card.cvv
          } : undefined,
          installments
        }
      });

      if (response.error) throw new Error(response.error.message);

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
          throw new Error('Não foi possível gerar o QR Code PIX. Tente outro método.');
        }
        setPaymentResult({ pix: result.pagarme.pix });
        toast.success('PIX gerado! Escaneie o QR Code para pagar.');
      } else if (paymentMethod === 'boleto') {
        if (!result.pagarme?.boleto?.url || !result.pagarme?.boleto?.barcode) {
          throw new Error('Não foi possível gerar o boleto. Tente outro método.');
        }
        setPaymentResult({ boleto: result.pagarme.boleto });
        toast.success('Boleto gerado! Pague até a data de vencimento.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const paymentMethods = [
    { method: 'pix' as const, icon: QrCode, label: 'PIX', badge: '3% off', description: 'Aprovação imediata' },
    { method: 'credit_card' as const, icon: CreditCard, label: 'Cartão', badge: 'até 12x', description: 'Parcelado' },
    { method: 'boleto' as const, icon: Barcode, label: 'Boleto', badge: null, description: '3 dias úteis' },
  ];

  // ─── Payment Result View ────────────────────────────────────────

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
                <img src={paymentResult.pix.qrCodeUrl} alt="QR Code PIX" className="w-52 h-52 mx-auto" />
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Ou copie o código PIX Copia e Cola:</p>
                <div className="flex gap-2">
                  <Input value={paymentResult.pix.qrCode} readOnly className="text-xs font-mono bg-muted/50" />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(paymentResult.pix!.qrCode)}>
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
                  <Input value={paymentResult.boleto.barcode} readOnly className="text-xs font-mono bg-muted/50" />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(paymentResult.boleto!.barcode)}>
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

  // ─── Form View ──────────────────────────────────────────────────

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
                    {selectedInstallment.installments}x de {formatCurrency(selectedInstallment.installmentValue)}
                  </span>
                </div>
                {selectedInstallment.installments === 1 ? (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <Sparkles className="h-4 w-4" />
                    <span>Sem juros</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>Total: {formatCurrency(selectedInstallment.totalValue)} <span className="text-xs ml-1">(com juros)</span></span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{formatPriceBRL(displayFinalPrice)}</span>
                  {displayFinalPrice < displayBasePrice && (
                    <span className="text-lg text-muted-foreground line-through">{formatPriceBRL(displayBasePrice)}</span>
                  )}
                </div>
                {paymentMethod === 'pix' && displayPixDiscount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <Zap className="h-4 w-4" />
                    <span><strong>3% de desconto</strong> no PIX</span>
                  </div>
                )}
              </>
            )}
            {appliedCoupon && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Tag className="h-4 w-4" />
                <span>Cupom <strong>{appliedCoupon.code}</strong> aplicado — {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}% off` : `${formatPriceBRL(appliedCoupon.discount_value)} off`}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-foreground">Forma de pagamento</h4>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(({ method, icon: Icon, label, badge, description }) => {
                const disabled = isMethodDisabled(method);
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => !disabled && setPaymentMethod(method)}
                    disabled={disabled}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      disabled ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                        : paymentMethod === method ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    {badge && (
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        method === 'pix' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>{badge}</span>
                    )}
                    <Icon className={`h-5 w-5 ${disabled ? 'text-muted-foreground' : paymentMethod === method ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium ${disabled ? 'text-muted-foreground' : paymentMethod === method ? 'text-primary' : 'text-foreground'}`}>{label}</span>
                    <span className="text-[10px] text-muted-foreground">{description}</span>
                  </button>
                );
              })}
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
                    {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatPriceBRL(appliedCoupon.discount_value)}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={removeCoupon}>Remover</Button>
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
                <Button variant="outline" size="sm" className="shrink-0 h-10" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
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
                <Input id="name" value={customer.name} onChange={(e) => setCustomer(c => ({ ...c, name: e.target.value }))} placeholder="Seu nome completo" className="h-11 bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">E-mail *</Label>
                <Input id="email" type="email" value={customer.email} onChange={(e) => setCustomer(c => ({ ...c, email: e.target.value }))} placeholder="seu@email.com" className="h-11 bg-muted/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="document" className="text-xs text-muted-foreground">CPF/CNPJ *</Label>
                  <Input id="document" value={customer.document} onChange={(e) => setCustomer(c => ({ ...c, document: formatDocument(e.target.value) }))} placeholder="000.000.000-00" maxLength={18} className="h-11 bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs text-muted-foreground">Telefone</Label>
                  <Input id="phone" value={customer.phone} onChange={(e) => setCustomer(c => ({ ...c, phone: formatPhone(e.target.value) }))} placeholder="(00) 00000-0000" maxLength={15} className="h-11 bg-muted/30" />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground">Endereço</h4>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="zipCode" className="text-xs text-muted-foreground">CEP *</Label>
                  <div className="relative">
                    <Input
                      id="zipCode"
                      value={address.zipCode}
                      onChange={(e) => {
                        const formatted = formatCep(e.target.value);
                        setAddress(a => ({ ...a, zipCode: formatted }));
                        if (formatted.replace(/\D/g, '').length === 8) fetchAddressByCep(formatted);
                      }}
                      placeholder="00000-000" maxLength={9} className="h-11 bg-muted/30"
                    />
                    {loadingCep && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs text-muted-foreground">Estado *</Label>
                  <Input id="state" value={address.state} onChange={(e) => setAddress(a => ({ ...a, state: e.target.value.toUpperCase() }))} placeholder="UF" maxLength={2} className="h-11 bg-muted/30" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-xs text-muted-foreground">Rua *</Label>
                <Input id="street" value={address.street} onChange={(e) => setAddress(a => ({ ...a, street: e.target.value }))} placeholder="Nome da rua" className="h-11 bg-muted/30" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="number" className="text-xs text-muted-foreground">Número *</Label>
                  <Input id="number" value={address.number} onChange={(e) => setAddress(a => ({ ...a, number: e.target.value }))} placeholder="Nº" className="h-11 bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="complement" className="text-xs text-muted-foreground">Complemento</Label>
                  <Input id="complement" value={address.complement} onChange={(e) => setAddress(a => ({ ...a, complement: e.target.value }))} placeholder="Apto, sala..." className="h-11 bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="neighborhood" className="text-xs text-muted-foreground">Bairro *</Label>
                  <Input id="neighborhood" value={address.neighborhood} onChange={(e) => setAddress(a => ({ ...a, neighborhood: e.target.value }))} placeholder="Bairro" className="h-11 bg-muted/30" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs text-muted-foreground">Cidade *</Label>
                <Input id="city" value={address.city} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="Cidade" className="h-11 bg-muted/30" />
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
                <p className="text-xs text-muted-foreground">Um QR Code será gerado para você pagar pelo app do seu banco</p>
              </div>
            </div>
          )}

          {paymentMethod === 'credit_card' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cardNumber" className="text-xs text-muted-foreground">Número do cartão</Label>
                <Input id="cardNumber" value={card.number} onChange={(e) => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))} placeholder="0000 0000 0000 0000" maxLength={19} className="h-11 bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holderName" className="text-xs text-muted-foreground">Nome no cartão</Label>
                <Input id="holderName" value={card.holderName} onChange={(e) => setCard(c => ({ ...c, holderName: e.target.value.toUpperCase() }))} placeholder="NOME COMO ESTÁ NO CARTÃO" className="h-11 bg-muted/30" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expMonth" className="text-xs text-muted-foreground">Mês</Label>
                  <Input id="expMonth" value={card.expMonth} onChange={(e) => setCard(c => ({ ...c, expMonth: e.target.value.replace(/\D/g, '') }))} placeholder="MM" maxLength={2} className="h-11 text-center bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expYear" className="text-xs text-muted-foreground">Ano</Label>
                  <Input id="expYear" value={card.expYear} onChange={(e) => setCard(c => ({ ...c, expYear: e.target.value.replace(/\D/g, '') }))} placeholder="AA" maxLength={2} className="h-11 text-center bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvv" className="text-xs text-muted-foreground">CVV</Label>
                  <Input id="cvv" type="password" value={card.cvv} onChange={(e) => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '') }))} placeholder="***" maxLength={4} className="h-11 text-center bg-muted/30" />
                </div>
              </div>
              
              {installmentOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Parcelas *</Label>
                  <Select value={installments.toString()} onValueChange={(v) => setInstallments(parseInt(v))}>
                    <SelectTrigger className="h-11 bg-muted/30">
                      <SelectValue placeholder="Selecione as parcelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {installmentOptions.map((opt) => (
                        <SelectItem key={opt.installments} value={opt.installments.toString()}>
                          {opt.installments === 1
                            ? `1x de ${formatCurrency(opt.installmentValue)} sem juros`
                            : `${opt.installments}x de ${formatCurrency(opt.installmentValue)} (Total ${formatCurrency(opt.totalValue)})`}
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
                <p className="text-xs text-muted-foreground">Vencimento em 3 dias úteis. Acesso liberado após compensação</p>
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
                Processando pagamento...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pagar {formatPriceBRL(paymentMethod === 'credit_card' ? (selectedInstallment?.totalAmount || displayFinalPrice) : displayFinalPrice)}
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
