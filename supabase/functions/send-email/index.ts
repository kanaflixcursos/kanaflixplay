import { Resend } from "npm:resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const PRODUCTION_URL = "https://cursos.kanaflix.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Brand colors
const brand = {
  primary: "#e67635",
  primaryDark: "#c55a1e",
  text: "#171717",
  textMuted: "#525252",
  bg: "#fafafa",
  white: "#ffffff",
  border: "#e5e5e5",
  success: "#16a34a",
  // Dark mode / mesh gradient colors
  darkBg: "#141619",
  darkCard: "#1c1f24",
  accent: "#1f4d47",
};

// Logo URL (dark version for dark header)
const LOGO_URL = `${PRODUCTION_URL}/logo-kanaflix-white.png`;

// Mesh gradient header for emails
const meshGradientHeader = `
  <td style="background: linear-gradient(135deg, ${brand.darkBg} 0%, ${brand.darkCard} 50%, ${brand.darkBg} 100%); padding: 32px; text-align: center; position: relative;">
    <!-- Mesh gradient overlay effect -->
    <div style="position: absolute; inset: 0; background: radial-gradient(ellipse at 20% 30%, rgba(230, 118, 53, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(31, 77, 71, 0.12) 0%, transparent 50%); pointer-events: none;"></div>
    <img src="${LOGO_URL}" alt="Kanaflix Play" height="32" style="display: block; margin: 0 auto; position: relative; z-index: 1;">
  </td>
`;

// Simplified email template with mesh gradient header
const emailTemplate = (content: string, preheader = "") => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanaflix Play</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${brand.bg};">
  <div style="display: none;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${brand.bg}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: ${brand.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Mesh Gradient Header -->
          <tr>
            ${meshGradientHeader}
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; border-top: 1px solid ${brand.border}; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: ${brand.textMuted};">
                © ${new Date().getFullYear()} Kanaflix Play
              </p>
              <p style="margin: 8px 0 0; font-size: 13px;">
                <a href="${PRODUCTION_URL}" style="color: ${brand.primary}; text-decoration: none;">cursos.kanaflix.com.br</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Reusable button component
const button = (text: string, url: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
      <td align="center">
        <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, ${brand.primary} 0%, ${brand.primaryDark} 100%); color: ${brand.white}; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">${text}</a>
      </td>
    </tr>
  </table>
`;

// Email templates
const templates = {
  welcome: (data: { userName: string; confirmUrl: string }) => {
    // Ensure URL uses production domain
    const safeUrl = data.confirmUrl.replace(/localhost:\d+/, PRODUCTION_URL.replace('https://', ''));
    
    return emailTemplate(`
      <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: ${brand.text};">
        Bem-vindo ao Kanaflix Play! 🎉
      </h1>
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: ${brand.textMuted};">
        Olá${data.userName ? ` <strong style="color: ${brand.text};">${data.userName}</strong>` : ''}! Confirme seu e-mail para começar:
      </p>
      ${button("Confirmar e-mail", safeUrl)}
      <p style="margin: 0; font-size: 13px; color: ${brand.textMuted};">
        Se você não criou esta conta, ignore este e-mail.
      </p>
    `, "Confirme seu e-mail para acessar o Kanaflix Play");
  },

  purchaseConfirmation: (data: {
    userName: string;
    courseName: string;
    courseUrl: string;
    amount: number;
    paymentMethod: string;
    orderId: string;
  }) => emailTemplate(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: ${brand.success}; color: ${brand.white}; padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 600;">
        ✓ Pagamento Confirmado
      </span>
    </div>
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: ${brand.text}; text-align: center;">
      Compra realizada!
    </h1>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: ${brand.textMuted}; text-align: center;">
      Olá${data.userName ? ` <strong style="color: ${brand.text};">${data.userName}</strong>` : ''}, seu acesso está liberado.
    </p>
    
    <div style="background-color: ${brand.bg}; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: ${brand.textMuted};">Curso</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${brand.text};">${data.courseName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${brand.textMuted};">Valor</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${brand.text};">R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${brand.textMuted};">Pedido</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${brand.text};">#${data.orderId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
    </div>
    
    ${button("Acessar curso", data.courseUrl)}
  `, `Pagamento confirmado - ${data.courseName}`),

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
  }) => emailTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: ${brand.text};">
      Aguardando pagamento 💳
    </h1>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: ${brand.textMuted};">
      Olá${data.userName ? ` <strong style="color: ${brand.text};">${data.userName}</strong>` : ''}, complete seu pagamento para liberar o acesso.
    </p>
    
    <div style="background-color: ${brand.bg}; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: ${brand.textMuted};">Curso</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${brand.text};">${data.courseName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: ${brand.textMuted};">Valor</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${brand.text};">R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}</td>
        </tr>
      </table>
    </div>
    
    ${data.paymentMethod === 'pix' ? `
      <div style="background-color: ${brand.white}; border: 2px solid ${brand.border}; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
        <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: ${brand.textMuted}; text-transform: uppercase;">Pague com PIX</p>
        ${data.pixQrCodeUrl ? `<img src="${data.pixQrCodeUrl}" alt="QR Code PIX" width="160" style="display: block; margin: 0 auto 12px;">` : ''}
        <p style="margin: 0 0 8px; font-size: 12px; color: ${brand.textMuted};">Código copia e cola:</p>
        <div style="background-color: ${brand.bg}; padding: 10px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 10px; color: ${brand.text};">
          ${data.pixQrCode || ''}
        </div>
        ${data.expiresAt ? `<p style="margin: 12px 0 0; font-size: 12px; color: ${brand.textMuted};">⏱ Expira em: ${data.expiresAt}</p>` : ''}
      </div>
    ` : `
      ${button("Visualizar Boleto", data.boletoUrl || '#')}
      ${data.boletoBarcode ? `
        <div style="background-color: ${brand.bg}; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; color: ${brand.textMuted};">Código de barras:</p>
          <p style="margin: 0; font-family: monospace; font-size: 12px; color: ${brand.text};">${data.boletoBarcode}</p>
        </div>
      ` : ''}
    `}
    
    <p style="margin: 20px 0 0; font-size: 13px; color: ${brand.textMuted}; text-align: center;">
      Você receberá uma confirmação após o pagamento.
    </p>
  `, `${data.paymentMethod === 'pix' ? 'PIX' : 'Boleto'} gerado - ${data.courseName}`),

  refundConfirmation: (data: {
    userName: string;
    courseName: string;
    amount: number;
    orderId: string;
  }) => emailTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: ${brand.text};">
      Reembolso processado
    </h1>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: ${brand.textMuted};">
      Olá${data.userName ? ` <strong style="color: ${brand.text};">${data.userName}</strong>` : ''}, seu reembolso foi processado.
    </p>
    
    <div style="background-color: ${brand.bg}; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: ${brand.textMuted};">Curso</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${brand.text};">${data.courseName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${brand.textMuted};">Valor</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${brand.text};">R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${brand.textMuted};">Pedido</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${brand.text};">#${data.orderId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0; font-size: 13px; color: ${brand.textMuted};">
      O valor será creditado em até 10 dias úteis.
    </p>
  `, `Reembolso processado - R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}`),
};

// Handler types
interface EmailRequest {
  action: 'welcome' | 'purchase_confirmation' | 'payment_pending' | 'refund_confirmation';
  to: string;
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
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

    const resend = new Resend(RESEND_API_KEY);

    const emailResponse = await resend.emails.send({
      from: "Kanaflix Play <noreply@cursos.kanaflix.com.br>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending email:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
