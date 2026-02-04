import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Brand colors based on the Kanaflix design system
const brandColors = {
  primary: "#e67635", // HSL 21 90% 48% converted to hex
  primaryDark: "#c55a1e",
  background: "#ffffff",
  foreground: "#171717",
  muted: "#f5f5f5",
  mutedForeground: "#3d4654",
  success: "#22c55e",
  border: "#e5e5e5",
};

// Email template wrapper
const emailWrapper = (content: string, preheader: string = "") => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Kanaflix Play</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: ${brandColors.muted};
      -webkit-font-smoothing: antialiased;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${brandColors.background};
    }
    
    .header {
      background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%);
      padding: 32px 40px;
      text-align: center;
    }
    
    .logo {
      height: 40px;
      width: auto;
    }
    
    .content {
      padding: 40px;
    }
    
    .title {
      font-size: 24px;
      font-weight: 600;
      color: ${brandColors.foreground};
      margin: 0 0 16px 0;
      line-height: 1.3;
    }
    
    .text {
      font-size: 16px;
      line-height: 1.6;
      color: ${brandColors.mutedForeground};
      margin: 0 0 24px 0;
    }
    
    .button {
      display: inline-block;
      background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 8px 0 24px 0;
      transition: transform 0.2s ease;
    }
    
    .button:hover {
      transform: translateY(-1px);
    }
    
    .card {
      background-color: ${brandColors.muted};
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: ${brandColors.mutedForeground};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px 0;
    }
    
    .card-value {
      font-size: 20px;
      font-weight: 700;
      color: ${brandColors.foreground};
      margin: 0;
    }
    
    .divider {
      height: 1px;
      background-color: ${brandColors.border};
      margin: 24px 0;
    }
    
    .footer {
      background-color: ${brandColors.muted};
      padding: 32px 40px;
      text-align: center;
    }
    
    .footer-text {
      font-size: 14px;
      color: ${brandColors.mutedForeground};
      margin: 0 0 8px 0;
    }
    
    .footer-link {
      color: ${brandColors.primary};
      text-decoration: none;
    }
    
    .success-badge {
      display: inline-block;
      background-color: ${brandColors.success};
      color: #ffffff;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .order-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid ${brandColors.border};
    }
    
    .order-label {
      color: ${brandColors.mutedForeground};
      font-size: 14px;
    }
    
    .order-value {
      color: ${brandColors.foreground};
      font-weight: 600;
      font-size: 14px;
    }
    
    @media only screen and (max-width: 600px) {
      .content, .footer, .header {
        padding: 24px !important;
      }
      
      .title {
        font-size: 20px !important;
      }
      
      .button {
        display: block;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>
  <div style="display: none; max-height: 0; overflow: hidden;">
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${brandColors.muted};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${brandColors.background}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Email templates
const templates = {
  // Welcome / Email Confirmation
  welcome: (data: { userName: string; confirmUrl: string }) => emailWrapper(`
    <tr>
      <td class="header">
        <img src="https://kanaflixplay.lovable.app/favicon.png" alt="Kanaflix Play" style="height: 48px; width: auto;">
      </td>
    </tr>
    <tr>
      <td class="content">
        <h1 class="title">Bem-vindo ao Kanaflix Play! 🎉</h1>
        <p class="text">
          Olá${data.userName ? `, <strong>${data.userName}</strong>` : ''}! Estamos muito felizes em ter você conosco.
        </p>
        <p class="text">
          Para começar sua jornada de aprendizado, confirme seu endereço de e-mail clicando no botão abaixo:
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${data.confirmUrl}" class="button">Confirmar meu e-mail</a>
            </td>
          </tr>
        </table>
        <div class="card">
          <p class="card-title">O que você pode fazer agora</p>
          <p style="margin: 0; color: ${brandColors.mutedForeground}; font-size: 14px; line-height: 1.8;">
            ✓ Explorar nossos cursos disponíveis<br>
            ✓ Assistir às aulas no seu ritmo<br>
            ✓ Acompanhar seu progresso<br>
            ✓ Interagir com a comunidade
          </p>
        </div>
        <p class="text" style="font-size: 14px; color: ${brandColors.mutedForeground};">
          Se você não criou uma conta no Kanaflix Play, pode ignorar este e-mail com segurança.
        </p>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p class="footer-text">
          © ${new Date().getFullYear()} Kanaflix Play. Todos os direitos reservados.
        </p>
        <p class="footer-text">
          <a href="https://kanaflixplay.lovable.app" class="footer-link">kanaflixplay.lovable.app</a>
        </p>
      </td>
    </tr>
  `, "Confirme seu e-mail para começar a aprender no Kanaflix Play"),

  // Purchase Confirmation
  purchaseConfirmation: (data: {
    userName: string;
    courseName: string;
    courseUrl: string;
    amount: number;
    paymentMethod: string;
    orderId: string;
  }) => emailWrapper(`
    <tr>
      <td class="header">
        <img src="https://kanaflixplay.lovable.app/favicon.png" alt="Kanaflix Play" style="height: 48px; width: auto;">
      </td>
    </tr>
    <tr>
      <td class="content">
        <div style="text-align: center;">
          <span class="success-badge">✓ Pagamento Confirmado</span>
        </div>
        <h1 class="title" style="text-align: center;">Sua compra foi confirmada!</h1>
        <p class="text" style="text-align: center;">
          Olá${data.userName ? `, <strong>${data.userName}</strong>` : ''}! Seu acesso ao curso já está liberado.
        </p>
        
        <div class="card">
          <p class="card-title">Detalhes do Pedido</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border};">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Curso</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border}; text-align: right;">
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px;">${data.courseName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border};">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Valor</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border}; text-align: right;">
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px;">R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border};">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Método</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border}; text-align: right;">
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px;">${data.paymentMethod}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Pedido</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px;">#${data.orderId.slice(0, 8).toUpperCase()}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${data.courseUrl}" class="button">Acessar Curso Agora</a>
            </td>
          </tr>
        </table>
        
        <p class="text" style="font-size: 14px; text-align: center;">
          Bons estudos! 📚
        </p>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p class="footer-text">
          © ${new Date().getFullYear()} Kanaflix Play. Todos os direitos reservados.
        </p>
        <p class="footer-text">
          <a href="https://kanaflixplay.lovable.app" class="footer-link">kanaflixplay.lovable.app</a>
        </p>
      </td>
    </tr>
  `, `Pagamento confirmado! Seu acesso ao curso ${data.courseName} está liberado.`),

  // Payment Pending (PIX/Boleto)
  paymentPending: (data: {
    userName: string;
    courseName: string;
    amount: number;
    paymentMethod: 'pix' | 'boleto';
    pixQrCode?: string;
    pixQrCodeUrl?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
    expiresAt?: string;
  }) => emailWrapper(`
    <tr>
      <td class="header">
        <img src="https://kanaflixplay.lovable.app/favicon.png" alt="Kanaflix Play" style="height: 48px; width: auto;">
      </td>
    </tr>
    <tr>
      <td class="content">
        <h1 class="title">Aguardando Pagamento 💳</h1>
        <p class="text">
          Olá${data.userName ? `, <strong>${data.userName}</strong>` : ''}! Seu pedido foi registrado e estamos aguardando a confirmação do pagamento.
        </p>
        
        <div class="card">
          <p class="card-title">Resumo do Pedido</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Curso:</span>
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px; float: right;">${data.courseName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Valor:</span>
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px; float: right;">R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}</span>
              </td>
            </tr>
          </table>
        </div>
        
        ${data.paymentMethod === 'pix' ? `
          <div class="card" style="text-align: center; background-color: #fff; border: 2px solid ${brandColors.border};">
            <p class="card-title" style="margin-bottom: 16px;">Pague com PIX</p>
            ${data.pixQrCodeUrl ? `<img src="${data.pixQrCodeUrl}" alt="QR Code PIX" style="max-width: 200px; margin: 0 auto 16px auto; display: block;">` : ''}
            <p style="font-size: 12px; color: ${brandColors.mutedForeground}; margin: 0 0 8px 0;">Ou copie o código:</p>
            <div style="background-color: ${brandColors.muted}; padding: 12px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 11px;">
              ${data.pixQrCode || ''}
            </div>
            ${data.expiresAt ? `<p style="font-size: 12px; color: ${brandColors.mutedForeground}; margin: 16px 0 0 0;">⏱ Expira em: ${data.expiresAt}</p>` : ''}
          </div>
        ` : `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.boletoUrl}" class="button">Visualizar Boleto</a>
          </div>
          ${data.boletoBarcode ? `
            <div class="card">
              <p class="card-title">Código de Barras</p>
              <div style="background-color: #fff; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; text-align: center; border: 1px solid ${brandColors.border};">
                ${data.boletoBarcode}
              </div>
            </div>
          ` : ''}
        `}
        
        <p class="text" style="font-size: 14px;">
          Após a confirmação do pagamento, você receberá um e-mail com o acesso ao curso.
        </p>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p class="footer-text">
          © ${new Date().getFullYear()} Kanaflix Play. Todos os direitos reservados.
        </p>
        <p class="footer-text">
          <a href="https://kanaflixplay.lovable.app" class="footer-link">kanaflixplay.lovable.app</a>
        </p>
      </td>
    </tr>
  `, `Aguardando pagamento via ${data.paymentMethod === 'pix' ? 'PIX' : 'Boleto'} para o curso ${data.courseName}`),

  // Refund Confirmation
  refundConfirmation: (data: {
    userName: string;
    courseName: string;
    amount: number;
    orderId: string;
  }) => emailWrapper(`
    <tr>
      <td class="header">
        <img src="https://kanaflixplay.lovable.app/favicon.png" alt="Kanaflix Play" style="height: 48px; width: auto;">
      </td>
    </tr>
    <tr>
      <td class="content">
        <h1 class="title">Reembolso Processado</h1>
        <p class="text">
          Olá${data.userName ? `, <strong>${data.userName}</strong>` : ''}! Seu reembolso foi processado com sucesso.
        </p>
        
        <div class="card">
          <p class="card-title">Detalhes do Reembolso</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border};">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Curso</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border}; text-align: right;">
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px;">${data.courseName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border};">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Valor Reembolsado</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid ${brandColors.border}; text-align: right;">
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px;">R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="color: ${brandColors.mutedForeground}; font-size: 14px;">Pedido</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="color: ${brandColors.foreground}; font-weight: 600; font-size: 14px;">#${data.orderId.slice(0, 8).toUpperCase()}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <p class="text" style="font-size: 14px;">
          O valor será creditado na sua forma de pagamento original em até 10 dias úteis, dependendo da sua instituição financeira.
        </p>
        
        <p class="text" style="font-size: 14px;">
          Se tiver dúvidas, entre em contato conosco.
        </p>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p class="footer-text">
          © ${new Date().getFullYear()} Kanaflix Play. Todos os direitos reservados.
        </p>
        <p class="footer-text">
          <a href="https://kanaflixplay.lovable.app" class="footer-link">kanaflixplay.lovable.app</a>
        </p>
      </td>
    </tr>
  `, `Seu reembolso de R$ ${(data.amount / 100).toFixed(2).replace('.', ',')} foi processado.`),
};

// Handler types
interface EmailRequest {
  action: 'welcome' | 'purchase_confirmation' | 'payment_pending' | 'refund_confirmation';
  to: string;
  data: Record<string, unknown>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, to, data }: EmailRequest = await req.json();

    if (!action || !to) {
      throw new Error("Missing required fields: action, to");
    }

    let html: string;
    let subject: string;

    switch (action) {
      case 'welcome':
        html = templates.welcome(data as { userName: string; confirmUrl: string });
        subject = "Confirme seu e-mail - Kanaflix Play";
        break;

      case 'purchase_confirmation':
        html = templates.purchaseConfirmation(data as {
          userName: string;
          courseName: string;
          courseUrl: string;
          amount: number;
          paymentMethod: string;
          orderId: string;
        });
        subject = "Pagamento Confirmado - Kanaflix Play";
        break;

      case 'payment_pending':
        const pendingData = data as {
          userName: string;
          courseName: string;
          amount: number;
          paymentMethod: 'pix' | 'boleto';
          pixQrCode?: string;
          pixQrCodeUrl?: string;
          boletoUrl?: string;
          boletoBarcode?: string;
          expiresAt?: string;
        };
        html = templates.paymentPending(pendingData);
        subject = pendingData.paymentMethod === 'pix' 
          ? "PIX Gerado - Kanaflix Play" 
          : "Boleto Gerado - Kanaflix Play";
        break;

      case 'refund_confirmation':
        html = templates.refundConfirmation(data as {
          userName: string;
          courseName: string;
          amount: number;
          orderId: string;
        });
        subject = "Reembolso Processado - Kanaflix Play";
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Kanaflix Play <noreply@kanaflixplay.com>",
        to: [to],
        subject,
        html,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
