import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateInstallments, formatCurrency } from "@/utils/pricingCalculator";

interface Course {
  id: string;
  title: string;
  price: number;
  thumbnail_url?: string | null;
  max_installments?: number;
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function CheckoutModal({ open, onOpenChange, course, onSuccess }: CheckoutModalProps) {
  const isMobile = useIsMobile();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    document: '',
    phone: ''
  });

  const [address, setAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  const [loadingCep, setLoadingCep] = useState(false);
  
  const [card, setCard] = useState({
    number: '',
    holderName: '',
    expMonth: '',
    expYear: '',
    cvv: ''
  });

  const [installments, setInstallments] = useState(1);

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

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

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

  const handleSubmit = async () => {
    if (!customer.name || !customer.email || !customer.document) {
      toast.error('Preencha todos os campos obrigatórios');
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
            number: card.number,
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
        throw new Error(result.error || 'Erro ao processar pagamento');
      }

      if (paymentMethod === 'credit_card' && result.order.status === 'paid') {
        toast.success('Pagamento aprovado! Você já pode acessar o curso.');
        onSuccess?.();
        onOpenChange(false);
      } else if (paymentMethod === 'pix') {
        setPaymentResult({ pix: result.pagarme.pix });
        toast.success('PIX gerado! Escaneie o QR Code para pagar.');
      } else if (paymentMethod === 'boleto') {
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

  const resetModal = () => {
    setPaymentResult(null);
    setCustomer({ name: '', email: '', document: '', phone: '' });
    setCard({ number: '', holderName: '', expMonth: '', expYear: '', cvv: '' });
    setAddress({ zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
  };

  const paymentMethods = [
    { 
      method: 'pix' as const, 
      icon: QrCode, 
      label: 'PIX',
      badge: null,
      badgeVariant: 'default' as const,
      description: 'Aprovação imediata'
    },
    { 
      method: 'credit_card' as const, 
      icon: CreditCard, 
      label: 'Cartão',
      badge: 'até 12x',
      badgeVariant: 'secondary' as const,
      description: 'Parcelado'
    },
    { 
      method: 'boleto' as const, 
      icon: Barcode, 
      label: 'Boleto',
      badge: null,
      badgeVariant: 'secondary' as const,
      description: '3 dias úteis'
    },
  ];

  const CheckoutContent = () => (
    <div className="flex flex-col h-full">
      {paymentResult ? (
        /* Payment Result */
        <div className="p-6 space-y-6">
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

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => { resetModal(); onOpenChange(false); }}
          >
            Fechar
          </Button>
        </div>
      ) : (
        /* Checkout Form */
        <div className="flex flex-col h-full">
          {/* Course Summary Header */}
          <div className="p-4 md:p-6 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-b">
            <div className="flex gap-4">
              {course.thumbnail_url && (
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-20 h-14 object-cover rounded-lg border shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Você está comprando</p>
                <h3 className="font-semibold text-foreground line-clamp-2 text-sm">{course.title}</h3>
              </div>
            </div>
            
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold text-foreground">{formatPrice(course.price)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Payment Method Selection */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Forma de pagamento</h4>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map(({ method, icon: Icon, label, badge, description }) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`relative flex flex-col items-center gap-1.5 ${badge ? 'pt-5' : 'pt-3'} pb-3 px-3 rounded-xl border-2 transition-all ${
                      paymentMethod === method
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    {badge && (
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        method === 'pix' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {badge}
                      </span>
                    )}
                    <Icon className={`h-5 w-5 ${paymentMethod === method ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium ${paymentMethod === method ? 'text-primary' : 'text-foreground'}`}>
                      {label}
                    </span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </button>
                ))}
              </div>
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

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-foreground">Endereço</h4>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-zipCode" className="text-xs text-muted-foreground">CEP *</Label>
                    <div className="relative">
                      <Input
                        id="m-zipCode"
                        value={address.zipCode}
                        onChange={(e) => {
                          const formatted = formatCep(e.target.value);
                          setAddress(a => ({ ...a, zipCode: formatted }));
                          if (formatted.replace(/\D/g, '').length === 8) {
                            fetchAddressByCep(formatted);
                          }
                        }}
                        placeholder="00000-000"
                        maxLength={9}
                        className="h-11 bg-muted/30"
                      />
                      {loadingCep && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-state" className="text-xs text-muted-foreground">Estado *</Label>
                    <Input
                      id="m-state"
                      value={address.state}
                      onChange={(e) => setAddress(a => ({ ...a, state: e.target.value.toUpperCase() }))}
                      placeholder="UF"
                      maxLength={2}
                      className="h-11 bg-muted/30"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-street" className="text-xs text-muted-foreground">Rua *</Label>
                  <Input
                    id="m-street"
                    value={address.street}
                    onChange={(e) => setAddress(a => ({ ...a, street: e.target.value }))}
                    placeholder="Nome da rua"
                    className="h-11 bg-muted/30"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-number" className="text-xs text-muted-foreground">Número *</Label>
                    <Input
                      id="m-number"
                      value={address.number}
                      onChange={(e) => setAddress(a => ({ ...a, number: e.target.value }))}
                      placeholder="Nº"
                      className="h-11 bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-complement" className="text-xs text-muted-foreground">Complemento</Label>
                    <Input
                      id="m-complement"
                      value={address.complement}
                      onChange={(e) => setAddress(a => ({ ...a, complement: e.target.value }))}
                      placeholder="Apto, sala..."
                      className="h-11 bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-neighborhood" className="text-xs text-muted-foreground">Bairro *</Label>
                    <Input
                      id="m-neighborhood"
                      value={address.neighborhood}
                      onChange={(e) => setAddress(a => ({ ...a, neighborhood: e.target.value }))}
                      placeholder="Bairro"
                      className="h-11 bg-muted/30"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-city" className="text-xs text-muted-foreground">Cidade *</Label>
                  <Input
                    id="m-city"
                    value={address.city}
                    onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))}
                    placeholder="Cidade"
                    className="h-11 bg-muted/30"
                  />
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
                {course.price >= 10000 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Parcelas</Label>
                    <RadioGroup 
                      value={installments.toString()} 
                      onValueChange={(v) => setInstallments(parseInt(v))}
                      className="grid grid-cols-2 gap-2"
                    >
                      {calculateInstallments(course.price / 100, course.max_installments ?? 12).map((opt) => (
                        <div 
                          key={opt.installments} 
                          className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            installments === opt.installments ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setInstallments(opt.installments)}
                        >
                          <RadioGroupItem value={opt.installments.toString()} id={`inst-${opt.installments}`} />
                          <Label htmlFor={`inst-${opt.installments}`} className="text-xs cursor-pointer flex-1">
                            {opt.installments === 1
                              ? `1x de ${formatCurrency(opt.installmentValue)} sem juros`
                              : `${opt.installments}x de ${formatCurrency(opt.installmentValue)} (Total ${formatCurrency(opt.totalValue)})`}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
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

          {/* Fixed Footer */}
          <div className="p-4 md:p-6 border-t bg-background/80 backdrop-blur-sm space-y-4">
            <Button 
              onClick={handleSubmit} 
              className="w-full h-12 text-base gap-2 shadow-lg" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Pagar {formatPrice(course.price)}
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>Pagamento 100% seguro via Pagar.me</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => { if (!o) resetModal(); onOpenChange(o); }}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Finalizar Compra</DrawerTitle>
          </DrawerHeader>
          <CheckoutContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetModal(); onOpenChange(o); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>Finalizar Compra</DialogTitle>
        </DialogHeader>
        <CheckoutContent />
      </DialogContent>
    </Dialog>
  );
}
