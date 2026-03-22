import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only check existence, never return values
  const configured: Record<string, boolean> = {
    PANDAVIDEO_API_KEY: !!Deno.env.get("PANDAVIDEO_API_KEY"),
    RESEND_API_KEY: !!Deno.env.get("RESEND_API_KEY"),
    PAGARME_API_KEY: !!Deno.env.get("PAGARME_API_KEY"),
  };

  return new Response(JSON.stringify({ configured }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
