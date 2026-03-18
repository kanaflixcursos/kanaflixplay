import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_PRODUCTION_URL = "https://cursos.kanaflix.com.br";

async function getProductionUrl(): Promise<string> {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await sb.from("site_settings").select("value").eq("key", "site_config").maybeSingle();
    if (data?.value && typeof data.value === "object") {
      return (data.value as Record<string, string>).production_url || DEFAULT_PRODUCTION_URL;
    }
  } catch { /* use default */ }
  return DEFAULT_PRODUCTION_URL;
}

// 1x1 transparent GIF
const PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function gifResponse() {
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function redirectResponse(target: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const campaignId = url.searchParams.get("cid");
  const email = url.searchParams.get("e");

  const PRODUCTION_URL = await getProductionUrl();

  // CLICK TRACKING MODE
  if (mode === "click") {
    const targetParam = url.searchParams.get("u");
    let targetUrl = PRODUCTION_URL;

    try {
      if (targetParam) {
        const parsedTarget = new URL(targetParam);
        if (parsedTarget.protocol === "https:" || parsedTarget.protocol === "http:") {
          targetUrl = parsedTarget.toString();
        }
      }
    } catch {
      return redirectResponse(PRODUCTION_URL);
    }

    if (!campaignId || !email || !UUID_REGEX.test(campaignId) || !EMAIL_REGEX.test(email) || email.length > 255) {
      return redirectResponse(targetUrl);
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const normalizedEmail = email.toLowerCase();

      const { data: leadRows } = await supabase
        .from("leads")
        .select("id, visitor_id")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: true })
        .limit(1);

      const lead = leadRows?.[0] || null;
      const visitorId = lead?.visitor_id || `lead:${normalizedEmail}`;

      if (lead && !lead.visitor_id) {
        await supabase.from("leads").update({ visitor_id: visitorId }).eq("id", lead.id);
      }

      const targetParsed = new URL(targetUrl);
      const utmCampaign = targetParsed.searchParams.get("utm_campaign");

      await supabase.from("user_events").insert({
        visitor_id: visitorId,
        user_id: null,
        event_type: "email_clicked",
        page_path: `${targetParsed.pathname}${targetParsed.search}`,
        event_data: {
          campaign_id: campaignId,
          recipient_email: normalizedEmail,
          target_url: targetUrl,
        },
        utm_source: "email",
        utm_medium: "campaign",
        utm_campaign: utmCampaign,
      });

      await supabase
        .from("leads")
        .update({
          utm_source_last: "email",
          utm_medium_last: "campaign",
          utm_campaign_last: utmCampaign,
        })
        .eq("email", normalizedEmail);
    } catch {
      // Silent fail - never block user redirect
    }

    return redirectResponse(targetUrl);
  }

  // OPEN TRACKING MODE (default)
  if (campaignId && email && UUID_REGEX.test(campaignId) && EMAIL_REGEX.test(email) && email.length <= 255) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error: insertError } = await supabase
        .from("email_opens")
        .upsert(
          { campaign_id: campaignId, recipient_email: email.toLowerCase() },
          { onConflict: "campaign_id,recipient_email" },
        );

      if (!insertError) {
        const { count } = await supabase
          .from("email_opens")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaignId);

        await supabase
          .from("email_campaigns")
          .update({ open_count: count || 0 })
          .eq("id", campaignId);
      }
    } catch {
      // Silent fail - tracking should not break email experience
    }
  }

  return gifResponse();
});
