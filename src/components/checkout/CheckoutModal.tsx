import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, QrCode, Barcode, Loader2, Copy, Check, ExternalLink, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  price: number;
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
          customer: {
            name: customer.name,
            email: customer.email,
            document: customer.document.replace(/\D/g, ''),
            phone: customer.phone?.replace(/\D/g, '')
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
  };

  const PaymentMethodButton = ({ 
    method, 
    icon: Icon, 
    label 
  }: { 
    method: PaymentMethod; 
    icon: typeof QrCode; 
    label: string 
  }) => (
    <button
      type="button"
      onClick={() => setPaymentMethod(method)}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
        paymentMethod === method
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetModal(); onOpenChange(o); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/5 p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl">Finalizar Compra</DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-4 bg-background/80 backdrop-blur-sm rounded-xl border">
            <p className="text-sm text-muted-foreground mb-1">Você está comprando</p>
            <h3 className="font-semibold text-foreground line-clamp-2">{course.title}</h3>
            <p className="text-2xl font-bold text-primary mt-2">{formatPrice(course.price)}</p>
          </div>
        </div>

        <div className="p-6">
          {paymentResult ? (
            /* Payment Result */
            <div className="space-y-6">
              {paymentResult.pix && (
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-xl inline-block shadow-sm border">
                    <img 
                      src={paymentResult.pix.qrCodeUrl} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ou copie o código PIX:</p>
                    <div className="flex gap-2">
                      <Input 
                        value={paymentResult.pix.qrCode} 
                        readOnly 
                        className="text-xs font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(paymentResult.pix!.qrCode)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expira em: {new Date(paymentResult.pix.expiresAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}

              {paymentResult.boleto && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Button asChild size="lg" className="gap-2">
                      <a href={paymentResult.boleto.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Abrir Boleto
                      </a>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Código de barras:</p>
                    <div className="flex gap-2">
                      <Input 
                        value={paymentResult.boleto.barcode} 
                        readOnly 
                        className="text-xs font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(paymentResult.boleto!.barcode)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Vencimento: {new Date(paymentResult.boleto.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
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
            <div className="space-y-6">
              {/* Customer Data */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-foreground">Seus dados</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs">Nome completo *</Label>
                    <Input
                      id="name"
                      value={customer.name}
                      onChange={(e) => setCustomer(c => ({ ...c, name: e.target.value }))}
                      placeholder="Seu nome completo"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer(c => ({ ...c, email: e.target.value }))}
                      placeholder="seu@email.com"
                      className="h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="document" className="text-xs">CPF/CNPJ *</Label>
                      <Input
                        id="document"
                        value={customer.document}
                        onChange={(e) => setCustomer(c => ({ ...c, document: formatDocument(e.target.value) }))}
                        placeholder="000.000.000-00"
                        maxLength={18}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs">Telefone</Label>
                      <Input
                        id="phone"
                        value={customer.phone}
                        onChange={(e) => setCustomer(c => ({ ...c, phone: formatPhone(e.target.value) }))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-foreground">Forma de pagamento</h4>
                <div className="grid grid-cols-3 gap-3">
                  <PaymentMethodButton method="pix" icon={QrCode} label="PIX" />
                  <PaymentMethodButton method="credit_card" icon={CreditCard} label="Cartão" />
                  <PaymentMethodButton method="boleto" icon={Barcode} label="Boleto" />
                </div>
              </div>

              {/* Payment Method Details */}
              <div className="min-h-[100px]">
                {paymentMethod === 'pix' && (
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-dashed">
                    <QrCode className="h-10 w-10 text-primary flex-shrink-0" />
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
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber" className="text-xs">Número do cartão</Label>
                      <Input
                        id="cardNumber"
                        value={card.number}
                        onChange={(e) => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holderName" className="text-xs">Nome no cartão</Label>
                      <Input
                        id="holderName"
                        value={card.holderName}
                        onChange={(e) => setCard(c => ({ ...c, holderName: e.target.value.toUpperCase() }))}
                        placeholder="NOME COMO ESTÁ NO CARTÃO"
                        className="h-11"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="expMonth" className="text-xs">Mês</Label>
                        <Input
                          id="expMonth"
                          value={card.expMonth}
                          onChange={(e) => setCard(c => ({ ...c, expMonth: e.target.value.replace(/\D/g, '') }))}
                          placeholder="MM"
                          maxLength={2}
                          className="h-11 text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expYear" className="text-xs">Ano</Label>
                        <Input
                          id="expYear"
                          value={card.expYear}
                          onChange={(e) => setCard(c => ({ ...c, expYear: e.target.value.replace(/\D/g, '') }))}
                          placeholder="AA"
                          maxLength={2}
                          className="h-11 text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv" className="text-xs">CVV</Label>
                        <Input
                          id="cvv"
                          type="password"
                          value={card.cvv}
                          onChange={(e) => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '') }))}
                          placeholder="***"
                          maxLength={4}
                          className="h-11 text-center"
                        />
                      </div>
                    </div>
                    {course.price >= 10000 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Parcelas</Label>
                        <RadioGroup 
                          value={installments.toString()} 
                          onValueChange={(v) => setInstallments(parseInt(v))}
                          className="grid grid-cols-2 gap-2"
                        >
                          {[1, 2, 3, 6, 10, 12].filter(n => course.price / n >= 500).map((n) => (
                            <div 
                              key={n} 
                              className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                installments === n ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => setInstallments(n)}
                            >
                              <RadioGroupItem value={n.toString()} id={`inst-${n}`} />
                              <Label htmlFor={`inst-${n}`} className="text-xs cursor-pointer flex-1">
                                {n}x de {formatPrice(Math.ceil(course.price / n))}
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
                    <Barcode className="h-10 w-10 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Boleto Bancário</p>
                      <p className="text-xs text-muted-foreground">
                        Vencimento em 3 dias úteis. Acesso liberado após compensação
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit} 
                className="w-full h-12 text-base gap-2" 
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

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>Pagamento seguro processado via Pagar.me</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
