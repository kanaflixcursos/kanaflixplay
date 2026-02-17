import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const url = new URL(req.url);
    const formSlug = url.searchParams.get("form");

    if (!formSlug) {
      return new Response(
        JSON.stringify({ error: "Missing form parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find form
    const { data: form, error: formError } = await supabase
      .from("lead_forms")
      .select("*")
      .eq("slug", formSlug)
      .eq("is_active", true)
      .single();

    if (formError || !form) {
      return new Response(
        JSON.stringify({ error: "Form not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { name, email, phone, ...rest } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    const fields = form.fields as Array<{ name: string; required: boolean }>;
    for (const field of fields) {
      if (field.required && !body[field.name]) {
        return new Response(
          JSON.stringify({ error: `Field '${field.name}' is required` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Sanitize inputs
    const sanitize = (val: unknown) =>
      typeof val === "string" ? val.trim().slice(0, 500) : val;

    const { error: insertError } = await supabase.from("leads").insert({
      form_id: form.id,
      name: sanitize(name) as string || null,
      email: (sanitize(email) as string).toLowerCase(),
      phone: sanitize(phone) as string || null,
      source: `form:${formSlug}`,
      custom_data: Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k.slice(0, 50), sanitize(v)])
      ),
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response: Record<string, unknown> = { success: true };
    if (form.redirect_url) {
      response.redirect_url = form.redirect_url;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Lead capture error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
