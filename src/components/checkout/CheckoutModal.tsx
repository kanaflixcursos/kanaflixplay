import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, QrCode, Barcode, Loader2, Copy, Check, ExternalLink } from "lucide-react";
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
  
  // Customer data
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    document: '',
    phone: ''
  });
  
  // Card data
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetModal(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Compra</DialogTitle>
        </DialogHeader>

        {/* Course Info */}
        <div className="bg-muted rounded-lg p-4 mb-4">
          <h3 className="font-semibold truncate">{course.title}</h3>
          <p className="text-2xl font-bold text-primary">{formatPrice(course.price)}</p>
        </div>

        {paymentResult ? (
          /* Payment Result */
          <div className="space-y-4">
            {paymentResult.pix && (
              <div className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img 
                    src={paymentResult.pix.qrCodeUrl} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ou copie o código PIX:</p>
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
                <p className="text-sm text-muted-foreground">
                  Expira em: {new Date(paymentResult.pix.expiresAt).toLocaleString('pt-BR')}
                </p>
              </div>
            )}

            {paymentResult.boleto && (
              <div className="space-y-4">
                <div className="text-center">
                  <Button asChild className="gap-2">
                    <a href={paymentResult.boleto.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir Boleto
                    </a>
                  </Button>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Código de barras:</p>
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
          <div className="space-y-4">
            {/* Customer Data */}
            <div className="space-y-3">
              <h4 className="font-medium">Dados do comprador</h4>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={customer.name}
                    onChange={(e) => setCustomer(c => ({ ...c, name: e.target.value }))}
                    placeholder="João da Silva"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer(c => ({ ...c, email: e.target.value }))}
                    placeholder="joao@email.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="document">CPF/CNPJ *</Label>
                    <Input
                      id="document"
                      value={customer.document}
                      onChange={(e) => setCustomer(c => ({ ...c, document: formatDocument(e.target.value) }))}
                      placeholder="000.000.000-00"
                      maxLength={18}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={customer.phone}
                      onChange={(e) => setCustomer(c => ({ ...c, phone: e.target.value.replace(/\D/g, '') }))}
                      placeholder="11999999999"
                      maxLength={11}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pix" className="gap-1 text-xs sm:text-sm">
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">PIX</span>
                </TabsTrigger>
                <TabsTrigger value="credit_card" className="gap-1 text-xs sm:text-sm">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Cartão</span>
                </TabsTrigger>
                <TabsTrigger value="boleto" className="gap-1 text-xs sm:text-sm">
                  <Barcode className="h-4 w-4" />
                  <span className="hidden sm:inline">Boleto</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pix" className="mt-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <QrCode className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Após confirmar, um QR Code será gerado para pagamento instantâneo.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="credit_card" className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="cardNumber">Número do cartão</Label>
                  <Input
                    id="cardNumber"
                    value={card.number}
                    onChange={(e) => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                  />
                </div>
                <div>
                  <Label htmlFor="holderName">Nome no cartão</Label>
                  <Input
                    id="holderName"
                    value={card.holderName}
                    onChange={(e) => setCard(c => ({ ...c, holderName: e.target.value.toUpperCase() }))}
                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="expMonth">Mês</Label>
                    <Input
                      id="expMonth"
                      value={card.expMonth}
                      onChange={(e) => setCard(c => ({ ...c, expMonth: e.target.value.replace(/\D/g, '') }))}
                      placeholder="MM"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expYear">Ano</Label>
                    <Input
                      id="expYear"
                      value={card.expYear}
                      onChange={(e) => setCard(c => ({ ...c, expYear: e.target.value.replace(/\D/g, '') }))}
                      placeholder="AA"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="password"
                      value={card.cvv}
                      onChange={(e) => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '') }))}
                      placeholder="***"
                      maxLength={4}
                    />
                  </div>
                </div>
                {course.price >= 10000 && (
                  <div>
                    <Label>Parcelas</Label>
                    <RadioGroup 
                      value={installments.toString()} 
                      onValueChange={(v) => setInstallments(parseInt(v))}
                      className="grid grid-cols-3 gap-2 mt-2"
                    >
                      {[1, 2, 3, 6, 10, 12].filter(n => course.price / n >= 500).map((n) => (
                        <div key={n} className="flex items-center space-x-2">
                          <RadioGroupItem value={n.toString()} id={`inst-${n}`} />
                          <Label htmlFor={`inst-${n}`} className="text-sm cursor-pointer">
                            {n}x {formatPrice(Math.ceil(course.price / n))}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="boleto" className="mt-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Barcode className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Vencimento em 3 dias úteis. O acesso é liberado após a compensação.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                `Pagar ${formatPrice(course.price)}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
