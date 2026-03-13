import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  source: string;
  status: string;
  visitor_id: string | null;
  custom_data: Record<string, unknown> | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_source_last: string | null;
  utm_medium_last: string | null;
  utm_campaign_last: string | null;
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // GET — return form config
    if (req.method === "GET") {
      const fields = form.fields as Array<{ name: string; label: string; type: string; required: boolean; options?: string[] }>;
      return new Response(
        JSON.stringify({
          slug: form.slug,
          name: form.name,
          description: form.description,
          redirect_url: form.redirect_url || null,
          fields: fields.map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            ...(f.options ? { options: f.options } : {}),
          })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // POST — capture lead
    const body = await req.json();
    const { email, visitor_id, utm_first, utm_last, page_path } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate required fields
    const fields = form.fields as Array<{ name: string; required: boolean; type: string }>;
    for (const field of fields) {
      if (field.required && !body[field.name]) {
        return new Response(
          JSON.stringify({ error: `Field '${field.name}' is required` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const sanitize = (val: unknown) =>
      typeof val === "string" ? val.trim().slice(0, 500) : val;

    const normalizedEmail = (sanitize(email) as string).toLowerCase();

    // Extract standard vs custom fields
    const nameField = fields.find((f) => f.name === "name");
    const phoneField = fields.find((f) => f.type === "phone");
    const standardFields = new Set([
      "email",
      "visitor_id",
      "utm_first",
      "utm_last",
      "page_path",
      nameField?.name,
      phoneField?.name,
    ].filter(Boolean));

    const customData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (!standardFields.has(k)) {
        customData[k.slice(0, 50)] = sanitize(v);
      }
    }

    // Parse UTM objects from frontend
    const firstTouch = utm_first || {};
    const lastTouch = utm_last || {};

    const { data: existingRows } = await supabase
      .from("leads")
      .select("id, name, phone, source, status, visitor_id, custom_data, utm_source, utm_medium, utm_campaign, utm_content, utm_source_last, utm_medium_last, utm_campaign_last")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })
      .limit(1);

    const existingLead = (existingRows?.[0] || null) as LeadRow | null;

    const mergedCustomData = {
      ...(existingLead?.custom_data || {}),
      ...customData,
    };

    let leadId: string;
    let resolvedVisitorId = existingLead?.visitor_id || visitor_id || null;

    if (existingLead) {
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          name: (sanitize(body.name) as string) || existingLead.name || null,
          phone: phoneField ? ((sanitize(body[phoneField.name]) as string) || existingLead.phone || null) : existingLead.phone,
          // Keep original source/first-touch; update last-touch and custom data
          source: existingLead.source || formSlug,
          visitor_id: resolvedVisitorId,
          custom_data: Object.keys(mergedCustomData).length > 0 ? mergedCustomData : null,
          utm_source: existingLead.utm_source || firstTouch.utm_source || null,
          utm_medium: existingLead.utm_medium || firstTouch.utm_medium || null,
          utm_campaign: existingLead.utm_campaign || firstTouch.utm_campaign || null,
          utm_content: existingLead.utm_content || firstTouch.utm_content || null,
          utm_source_last: lastTouch.utm_source || existingLead.utm_source_last || null,
          utm_medium_last: lastTouch.utm_medium || existingLead.utm_medium_last || null,
          utm_campaign_last: lastTouch.utm_campaign || existingLead.utm_campaign_last || null,
        })
        .eq("id", existingLead.id);

      if (updateError) {
        console.error("Lead update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update lead" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      leadId = existingLead.id;
    } else {
      const { data: insertedLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          form_id: form.id,
          name: (sanitize(body.name) as string) || null,
          email: normalizedEmail,
          phone: phoneField ? ((sanitize(body[phoneField.name]) as string) || null) : null,
          source: formSlug,
          visitor_id: resolvedVisitorId,
          custom_data: Object.keys(customData).length > 0 ? customData : null,
          // First-touch UTMs
          utm_source: firstTouch.utm_source || null,
          utm_medium: firstTouch.utm_medium || null,
          utm_campaign: firstTouch.utm_campaign || null,
          utm_content: firstTouch.utm_content || null,
          // Last-touch UTMs
          utm_source_last: lastTouch.utm_source || null,
          utm_medium_last: lastTouch.utm_medium || null,
          utm_campaign_last: lastTouch.utm_campaign || null,
        })
        .select("id")
        .single();

      if (insertError || !insertedLead) {
        console.error("Lead insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save lead" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      leadId = insertedLead.id;
    }

    // Ensure visitor_id exists for journey tracking continuity
    if (!resolvedVisitorId) {
      resolvedVisitorId = `lead:${normalizedEmail}`;
      await supabase.from("leads").update({ visitor_id: resolvedVisitorId }).eq("id", leadId);
    }

    // Register lead capture in visitor journey timeline
    await supabase.from("user_events").insert({
      visitor_id: resolvedVisitorId,
      user_id: null,
      event_type: "lead_captured",
      page_path: typeof page_path === "string" ? page_path.slice(0, 500) : null,
      event_data: {
        lead_id: leadId,
        form_slug: formSlug,
        lead_email: normalizedEmail,
      },
      utm_source: firstTouch.utm_source || null,
      utm_medium: firstTouch.utm_medium || null,
      utm_campaign: firstTouch.utm_campaign || null,
    });

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
