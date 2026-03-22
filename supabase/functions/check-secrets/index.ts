import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Global env-level secrets (always checked)
  const envSecrets: Record<string, boolean> = {
    PANDAVIDEO_API_KEY: !!Deno.env.get("PANDAVIDEO_API_KEY"),
    RESEND_API_KEY: !!Deno.env.get("RESEND_API_KEY"),
    PAGARME_API_KEY: !!Deno.env.get("PAGARME_API_KEY"),
  };

  // If creator_id is provided, also check creator_settings
  const url = new URL(req.url);
  const creatorId = url.searchParams.get("creator_id");

  let creatorSecrets: Record<string, boolean> = {
    pandavideo_api_key: false,
    resend_api_key: false,
  };

  if (creatorId) {
    try {
      const sbAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data } = await sbAdmin
        .from("creator_settings")
        .select("pandavideo_api_key, resend_api_key")
        .eq("creator_id", creatorId)
        .single();

      if (data) {
        creatorSecrets.pandavideo_api_key = !!data.pandavideo_api_key;
        creatorSecrets.resend_api_key = !!data.resend_api_key;
      }
    } catch (e) {
      console.error("Error checking creator secrets:", e);
    }
  }

  // Effective: true if either env or creator-level key exists
  const effective: Record<string, boolean> = {
    pandavideo: creatorSecrets.pandavideo_api_key || envSecrets.PANDAVIDEO_API_KEY,
    resend: creatorSecrets.resend_api_key || envSecrets.RESEND_API_KEY,
    pagarme: envSecrets.PAGARME_API_KEY,
  };

  return new Response(JSON.stringify({ configured: envSecrets, creatorSecrets, effective }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
