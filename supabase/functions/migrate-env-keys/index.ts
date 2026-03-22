import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-shot function: copies env-level API keys to a creator's settings row.
 * Call with POST { creator_id: "..." }
 * Only admins can invoke this.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sbAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Accept service role key OR admin user token
  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  if (token !== serviceRoleKey) {
    // Verify as user token - must be admin
    const { data: userData, error: userError } = await sbAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await sbAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden - admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const { creator_id } = await req.json();
  if (!creator_id) {
    return new Response(JSON.stringify({ error: "creator_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pandaKey = Deno.env.get("PANDAVIDEO_API_KEY") || "";
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";

  const updateFields: Record<string, string> = {};
  if (pandaKey) updateFields.pandavideo_api_key = pandaKey;
  if (resendKey) updateFields.resend_api_key = resendKey;

  if (Object.keys(updateFields).length === 0) {
    return new Response(JSON.stringify({ message: "No env keys found to migrate" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error } = await sbAdmin
    .from("creator_settings")
    .update(updateFields)
    .eq("creator_id", creator_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    message: "Keys migrated successfully",
    migrated: Object.keys(updateFields),
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
