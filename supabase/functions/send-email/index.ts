import { Resend } from "npm:resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_PRODUCTION_URL = "https://cursos.kanaflix.com.br";
const DEFAULT_PLATFORM_NAME = "Kanaflix Play";
const DEFAULT_SENDER_NAME = "Kanaflix Play";
const DEFAULT_SENDER_ADDRESS = "noreply@cursos.kanaflix.com.br";

interface SiteConfig {
  production_url: string;
  platform_name: string;
  email_sender_name: string;
  email_sender_address: string;
}

async function fetchSiteConfig(): Promise<SiteConfig> {
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);
    const { data } = await sb.from("site_settings").select("value").eq("key", "site_config").maybeSingle();
    if (data?.value && typeof data.value === "object") {
      const v = data.value as Record<string, string>;
      return {
        production_url: v.production_url || DEFAULT_PRODUCTION_URL,
        platform_name: v.platform_name || DEFAULT_PLATFORM_NAME,
        email_sender_name: v.email_sender_name || DEFAULT_SENDER_NAME,
        email_sender_address: v.email_sender_address || DEFAULT_SENDER_ADDRESS,
      };
    }
  } catch (e) {
    console.error("Failed to fetch site config, using defaults:", e);
  }
  return {
    production_url: DEFAULT_PRODUCTION_URL,
    platform_name: DEFAULT_PLATFORM_NAME,
    email_sender_name: DEFAULT_SENDER_NAME,
    email_sender_address: DEFAULT_SENDER_ADDRESS,
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Brand colors matching design system
const brand = {
  primary: "#e67635", // hsl(21, 90%, 48%)
  primaryDark: "#c55a1e",
  text: "#171717",
  textMuted: "#737373",
  bg: "#ffffff", // White background
  white: "#ffffff",
  border: "#e5e5e5",
  success: "#16a34a",
  // Light mesh gradient colors (matching system)
  meshPrimary: "rgba(230, 118, 53, 0.06)", // primary with 6% opacity
  meshAccent: "rgba(31, 77, 71, 0.05)", // accent with 5% opacity
};

// Logo URL (dark version for light header)
let PRODUCTION_URL = DEFAULT_PRODUCTION_URL;
let PLATFORM_NAME = DEFAULT_PLATFORM_NAME;
const getLOGO_URL = () => `${PRODUCTION_URL}/logo-kanaflix.png`;

// Google Sans font import for emails
const fontImport = `
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap');
  </style>
`;

// Font family stack
const fontFamily = "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const EMAIL_TRACKING_FN_PATH = "/functions/v1/email-tracking";
const HREF_REGEX = /href=(["'])([^"']+)\1/g;

function shouldTrackLink(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return !(lower.startsWith("#") || lower.startsWith("mailto:") || lower.startsWith("tel:"));
}

function normalizeCampaignUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${PRODUCTION_URL}${trimmed}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;

  return null;
}

function appendUtmToUrl(url: string, campaignSlug: string): string {
  const parsed = new URL(url);
  if (!parsed.searchParams.get("utm_source")) parsed.searchParams.set("utm_source", "email");
  if (!parsed.searchParams.get("utm_medium")) parsed.searchParams.set("utm_medium", "campaign");
  if (!parsed.searchParams.get("utm_campaign")) parsed.searchParams.set("utm_campaign", campaignSlug);
  return parsed.toString();
}

function buildTrackedClickUrl(input: {
  supabaseUrl: string;
  campaignId: string;
  recipientEmail: string;
  targetUrl: string;
}) {
  const { supabaseUrl, campaignId, recipientEmail, targetUrl } = input;
  if (!supabaseUrl || !campaignId) return targetUrl;

  const qs = new URLSearchParams({
    mode: "click",
    cid: campaignId,
    e: recipientEmail.toLowerCase(),
    u: targetUrl,
  });

  return `${supabaseUrl}${EMAIL_TRACKING_FN_PATH}?${qs.toString()}`;
}

// Light mesh gradient header matching system background
const meshGradientHeader = () => `
  <td style="background: linear-gradient(135deg, rgba(230, 118, 53, 0.08) 0%, rgba(255, 255, 255, 0.9) 35%, rgba(31, 77, 71, 0.06) 70%, rgba(230, 118, 53, 0.04) 100%); padding: 48px 32px; text-align: center; border-bottom: 1px solid #f0f0f0;">
    <img src="${getLOGO_URL()}" alt="${PLATFORM_NAME}" height="40" style="display: block; margin: 0 auto;">
  </td>
`;

// Email template with proper typography (Google Sans)
const emailTemplate = (content: string, preheader = "") => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${PLATFORM_NAME}</title>
  ${fontImport}
</head>
<body style="margin: 0; padding: 0; font-family: ${fontFamily}; background-color: ${brand.bg}; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${brand.bg}; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: ${brand.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header with mesh gradient -->
          <tr>
            ${meshGradientHeader()}
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 28px; font-family: ${fontFamily};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 28px; border-top: 1px solid ${brand.border}; text-align: center; background-color: #fafafa;">
              <p style="margin: 0; font-size: 13px; color: ${brand.textMuted}; font-family: ${fontFamily};">
                © ${new Date().getFullYear()} ${PLATFORM_NAME}. Todos os direitos reservados.
              </p>
              <p style="margin: 10px 0 0; font-size: 13px; font-family: ${fontFamily};">
                <a href="${PRODUCTION_URL}" style="color: ${brand.primary}; text-decoration: none; font-weight: 500;">${PRODUCTION_URL.replace('https://', '')}</a>
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

// Reusable button component with proper styling
const button = (text: string, url: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
    <tr>
      <td align="center">
        <a href="${url}" style="display: inline-block; background: ${brand.primary}; color: ${brand.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500; font-size: 15px; font-family: ${fontFamily}; letter-spacing: -0.01em;">${text}</a>
      </td>
    </tr>
  </table>
`;

// Email templates with proper typography
const templates = {
  welcome: (data: { userName: string; confirmUrl: string }) => {
    // Ensure URL uses production domain
    const safeUrl = data.confirmUrl.replace(/localhost:\d+/, PRODUCTION_URL.replace('https://', ''));
    
    return emailTemplate(`
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 500; color: ${brand.text}; font-family: ${fontFamily}; letter-spacing: -0.03em;">
        Bem-vindo ao ${PLATFORM_NAME}! 🎉
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: ${brand.textMuted}; font-family: ${fontFamily};">
        Olá${data.userName ? ` <strong style="color: ${brand.text}; font-weight: 500;">${data.userName}</strong>` : ''}! Confirme seu e-mail para começar:
      </p>
      ${button("Confirmar e-mail", safeUrl)}
      <p style="margin: 0; font-size: 13px; color: ${brand.textMuted}; font-family: ${fontFamily};">
        Se você não criou esta conta, ignore este e-mail.
      </p>
    `, `Confirme seu e-mail para acessar o ${PLATFORM_NAME}`);
  },

  purchaseConfirmation: (data: {
    userName: string;
    courseName: string;
    courseUrl: string;
    amount: number;
    paymentMethod: string;
    orderId: string;
    installments?: number;
  }) => {
    const amountFormatted = `R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}`;
    const installments = data.installments || 1;
    const installmentValue = installments > 1
      ? `R$ ${(data.amount / 100 / installments).toFixed(2).replace('.', ',')}`
      : null;
    const valorDisplay = installments > 1
      ? `${installments}x de ${installmentValue} (Total: ${amountFormatted})`
      : amountFormatted;

    return emailTemplate(`
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${brand.success}; color: ${brand.white}; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; font-family: ${fontFamily};">
        ✓ Pagamento Confirmado
      </span>
    </div>
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 500; color: ${brand.text}; text-align: center; font-family: ${fontFamily}; letter-spacing: -0.03em;">
      Compra realizada com sucesso!
    </h1>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: ${brand.textMuted}; text-align: center; font-family: ${fontFamily};">
      Olá${data.userName ? ` <strong style="color: ${brand.text}; font-weight: 500;">${data.userName}</strong>` : ''}, seu acesso ao curso já está liberado.
    </p>
    
    <div style="background-color: ${brand.bg}; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; font-family: ${fontFamily};">
        <tr>
          <td style="padding: 10px 0; color: ${brand.textMuted};">Curso</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: ${brand.text};">${data.courseName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: ${brand.textMuted}; border-top: 1px solid ${brand.border};">Pagamento</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: ${brand.text}; border-top: 1px solid ${brand.border};">${data.paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: ${brand.textMuted}; border-top: 1px solid ${brand.border};">Valor</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: ${brand.text}; border-top: 1px solid ${brand.border};">${valorDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: ${brand.textMuted}; border-top: 1px solid ${brand.border};">Pedido</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: ${brand.text}; border-top: 1px solid ${brand.border};">#${data.orderId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
    </div>
    
    ${button("Acessar curso agora", data.courseUrl)}
  `, `Pagamento confirmado - ${data.courseName}`);
  },

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
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 500; color: ${brand.text}; font-family: ${fontFamily}; letter-spacing: -0.03em;">
      Aguardando pagamento 💳
    </h1>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: ${brand.textMuted}; font-family: ${fontFamily};">
      Olá${data.userName ? ` <strong style="color: ${brand.text}; font-weight: 500;">${data.userName}</strong>` : ''}, complete seu pagamento para liberar o acesso ao curso.
    </p>
    
    <div style="background-color: ${brand.bg}; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; font-family: ${fontFamily};">
        <tr>
          <td style="padding: 8px 0; color: ${brand.textMuted};">Curso</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500; color: ${brand.text};">${data.courseName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${brand.textMuted}; border-top: 1px solid ${brand.border};">Valor</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 500; color: ${brand.text}; border-top: 1px solid ${brand.border};">R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}</td>
        </tr>
      </table>
    </div>
    
    ${data.paymentMethod === 'pix' ? `
      <div style="background-color: ${brand.white}; border: 2px solid ${brand.border}; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="margin: 0 0 16px; font-size: 12px; font-weight: 500; color: ${brand.textMuted}; text-transform: uppercase; letter-spacing: 0.05em; font-family: ${fontFamily};">Pague com PIX</p>
        ${data.pixQrCodeUrl ? `<img src="${data.pixQrCodeUrl}" alt="QR Code PIX" width="180" style="display: block; margin: 0 auto 16px;">` : ''}
        <p style="margin: 0 0 8px; font-size: 12px; color: ${brand.textMuted}; font-family: ${fontFamily};">Código copia e cola:</p>
        <div style="background-color: ${brand.bg}; padding: 12px; border-radius: 8px; word-break: break-all; font-family: 'SF Mono', Monaco, monospace; font-size: 10px; color: ${brand.text};">
          ${data.pixQrCode || ''}
        </div>
        ${data.expiresAt ? `<p style="margin: 16px 0 0; font-size: 12px; color: ${brand.textMuted}; font-family: ${fontFamily};">⏱ Expira em: ${data.expiresAt}</p>` : ''}
      </div>
    ` : `
      ${button("Visualizar Boleto", data.boletoUrl || '#')}
      ${data.boletoBarcode ? `
        <div style="background-color: ${brand.bg}; border-radius: 12px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; color: ${brand.textMuted}; font-family: ${fontFamily};">Código de barras:</p>
          <p style="margin: 0; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; color: ${brand.text};">${data.boletoBarcode}</p>
        </div>
      ` : ''}
    `}
    
    <p style="margin: 24px 0 0; font-size: 13px; color: ${brand.textMuted}; text-align: center; font-family: ${fontFamily};">
      Você receberá uma confirmação assim que o pagamento for identificado.
    </p>
  `, `${data.paymentMethod === 'pix' ? 'PIX' : 'Boleto'} gerado - ${data.courseName}`),

  refundConfirmation: (data: {
    userName: string;
    courseName: string;
    amount: number;
    orderId: string;
  }) => emailTemplate(`
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 500; color: ${brand.text}; font-family: ${fontFamily}; letter-spacing: -0.03em;">
      Reembolso processado
    </h1>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: ${brand.textMuted}; font-family: ${fontFamily};">
      Olá${data.userName ? ` <strong style="color: ${brand.text}; font-weight: 500;">${data.userName}</strong>` : ''}, seu reembolso foi processado com sucesso.
    </p>
    
    <div style="background-color: ${brand.bg}; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; font-family: ${fontFamily};">
        <tr>
          <td style="padding: 10px 0; color: ${brand.textMuted};">Curso</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: ${brand.text};">${data.courseName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: ${brand.textMuted}; border-top: 1px solid ${brand.border};">Valor</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: ${brand.text}; border-top: 1px solid ${brand.border};">R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: ${brand.textMuted}; border-top: 1px solid ${brand.border};">Pedido</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 500; color: ${brand.text}; border-top: 1px solid ${brand.border};">#${data.orderId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0; font-size: 13px; color: ${brand.textMuted}; font-family: ${fontFamily};">
      O valor será creditado em sua conta em até 10 dias úteis, dependendo do seu banco.
    </p>
  `, `Reembolso processado - R$ ${(data.amount / 100).toFixed(2).replace('.', ',')}`),
};

// Handler types
interface EmailRequest {
  action: 'welcome' | 'purchase_confirmation' | 'payment_pending' | 'refund_confirmation' | 'campaign';
  to: string;
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch dynamic site configuration
    const siteConfig = await fetchSiteConfig();
    PRODUCTION_URL = siteConfig.production_url;
    PLATFORM_NAME = siteConfig.platform_name;

    // Verify caller is authenticated (internal service calls use anon key + auth header)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, to, data }: EmailRequest = await req.json();

    if (!action || !to) {
      throw new Error("Missing required fields: action, to");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Invalid email address");
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
          installments?: number;
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

      case 'campaign': {
        const campaignData = data as { subject: string; htmlContent: string; recipientName?: string; campaignId?: string; campaignTag?: string };
        subject = campaignData.subject || 'Novidades - Kanaflix Play';
        const campaignSlug = campaignData.campaignTag || campaignData.campaignId || 'email';
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

        // Strip embedded blocks JSON comment and replace variables
        let campaignContent = campaignData.htmlContent
          .replace(/<!-- BLOCKS:[\s\S]*? -->/g, '')
          .replace(/\{\{name\}\}/g, campaignData.recipientName || '');

        // Normalize links, append UTMs and route click tracking through email-tracking redirect
        campaignContent = campaignContent.replace(HREF_REGEX, (_match: string, quote: string, rawUrl: string) => {
          if (!shouldTrackLink(rawUrl)) {
            return `href=${quote}${rawUrl}${quote}`;
          }

          const normalizedUrl = normalizeCampaignUrl(rawUrl);
          if (!normalizedUrl) {
            return `href=${quote}${rawUrl}${quote}`;
          }

          const urlWithUtm = appendUtmToUrl(normalizedUrl, campaignSlug);
          const trackedUrl = buildTrackedClickUrl({
            supabaseUrl,
            campaignId: campaignData.campaignId || '',
            recipientEmail: to,
            targetUrl: urlWithUtm,
          });

          return `href=${quote}${trackedUrl}${quote}`;
        });

        // Add tracking pixel if campaignId is provided
        const trackingPixel = campaignData.campaignId
          ? `<img src="${supabaseUrl}${EMAIL_TRACKING_FN_PATH}?cid=${encodeURIComponent(campaignData.campaignId)}&e=${encodeURIComponent(to)}" width="1" height="1" style="display:none;" alt="" />`
          : '';

        html = emailTemplate(campaignContent + trackingPixel, subject);
        break;
      }

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

    console.log("Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
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
