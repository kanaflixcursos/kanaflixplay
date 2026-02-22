import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const PRODUCTION_URL = "https://cursos.kanaflix.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOGO_URL = `${PRODUCTION_URL}/logo-kanaflix.png`;
const fontFamily = "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const brand = {
  primary: "#e67635",
  primaryDark: "#c55a1e",
  text: "#171717",
  textMuted: "#737373",
  bg: "#ffffff",
  white: "#ffffff",
  border: "#e5e5e5",
};

const fontImport = `
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap');
  </style>
`;

const meshGradientHeader = `
  <td style="background: linear-gradient(135deg, rgba(230, 118, 53, 0.08) 0%, rgba(255, 255, 255, 0.9) 35%, rgba(31, 77, 71, 0.06) 70%, rgba(230, 118, 53, 0.04) 100%); padding: 48px 32px; text-align: center; border-bottom: 1px solid #f0f0f0;">
    <img src="${LOGO_URL}" alt="Kanaflix Play" height="40" style="display: block; margin: 0 auto;">
  </td>
`;

const emailTemplate = (content: string, preheader = "") => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Kanaflix Play</title>
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
            ${meshGradientHeader}
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
                © ${new Date().getFullYear()} Kanaflix Play. Todos os direitos reservados.
              </p>
              <p style="margin: 10px 0 0; font-size: 13px; font-family: ${fontFamily};">
                <a href="${PRODUCTION_URL}" style="color: ${brand.primary}; text-decoration: none; font-weight: 500;">cursos.kanaflix.com.br</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "check") {
      // Check if email exists in imported_users
      const normalizedEmail = email?.toLowerCase().trim();
      if (!normalizedEmail) throw new Error("Email é obrigatório");

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) throw new Error("Formato de email inválido");

      const { data: imported } = await supabaseAdmin
        .from("imported_users")
        .select("id, full_name, status")
        .ilike("email", normalizedEmail)
        .single();

      if (!imported) {
        return new Response(
          JSON.stringify({ found: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (imported.status === "completed") {
        return new Response(
          JSON.stringify({ found: true, completed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ found: true, completed: false, name: imported.full_name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_magic_link") {
      const normalizedEmail = email?.toLowerCase().trim();
      if (!normalizedEmail) throw new Error("Email é obrigatório");
      const magicLinkEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!magicLinkEmailRegex.test(normalizedEmail)) throw new Error("Formato de email inválido");

      // Verify email in imported_users
      const { data: imported } = await supabaseAdmin
        .from("imported_users")
        .select("*")
        .ilike("email", normalizedEmail)
        .single();

      if (!imported) {
        throw new Error("Email não encontrado na lista de importados");
      }

      if (imported.status === "completed") {
        throw new Error("Este usuário já completou o cadastro. Faça login normalmente.");
      }

      // Check if auth user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create auth user with a random password (user will set their own later)
        const tempPassword = crypto.randomUUID() + "Aa1!";
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: imported.full_name,
            imported_user: true,
            needs_onboarding: true,
          },
        });

        if (createError) throw createError;
        userId = newUser.user.id;
      }

      // Update imported_users with auth_user_id
      await supabaseAdmin
        .from("imported_users")
        .update({ auth_user_id: userId, status: "link_sent" })
        .eq("id", imported.id);

      // Update user metadata to ensure needs_onboarding is set
      await supabaseAdmin.auth.admin.updateUser(userId, {
        user_metadata: {
          full_name: imported.full_name,
          imported_user: true,
          needs_onboarding: true,
        },
      });

      // Generate magic link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
        options: {
          redirectTo: `${PRODUCTION_URL}/onboarding`,
        },
      });

      if (linkError) throw linkError;

      // The link from generateLink contains the token - we need to build the proper URL
      const token_hash = linkData.properties?.hashed_token;
      const magicLinkUrl = `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=magiclink&redirect_to=${encodeURIComponent(PRODUCTION_URL + "/onboarding")}`;

      // Send email via Resend
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: "Kanaflix Play <noreply@cursos.kanaflix.com.br>",
        to: [normalizedEmail],
        subject: "Seu acesso ao Kanaflix Play 🎓",
        html: emailTemplate(`
          <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 500; color: ${brand.text}; font-family: ${fontFamily}; letter-spacing: -0.03em;">
            Olá, ${imported.full_name}! 👋
          </h1>
          <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: ${brand.textMuted}; font-family: ${fontFamily};">
            Seu acesso à plataforma Kanaflix Play está pronto! Clique no botão abaixo para acessar e configurar sua conta.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
            <tr><td align="center">
              <a href="${magicLinkUrl}" style="display: inline-block; background: ${brand.primary}; color: ${brand.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500; font-size: 15px; font-family: ${fontFamily}; letter-spacing: -0.01em;">Acessar Kanaflix Play</a>
            </td></tr>
          </table>
          <p style="margin: 0; font-size: 13px; color: ${brand.textMuted}; font-family: ${fontFamily};">
            Este link é válido por 24 horas. Se você não solicitou este acesso, ignore este e-mail.
          </p>
        `, "Seu acesso ao Kanaflix Play está pronto"),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Ação inválida");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("hotmart-access error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
