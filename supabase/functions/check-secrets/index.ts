import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const creatorId = url.searchParams.get("creator_id");

  if (!creatorId) {
    return new Response(
      JSON.stringify({ error: "creator_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await sbAdmin
      .from("creator_settings")
      .select("pandavideo_api_key, resend_api_key, gtm_container_id")
      .eq("creator_id", creatorId)
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: "Creator settings not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only report existence, never return actual values
    const configured: Record<string, boolean> = {
      pandavideo: !!data.pandavideo_api_key,
      resend: !!data.resend_api_key,
      gtm: !!data.gtm_container_id,
    };

    return new Response(JSON.stringify({ configured }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error checking secrets:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
