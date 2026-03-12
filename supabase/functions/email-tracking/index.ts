import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 1x1 transparent GIF
const PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0));

// UUID v4 pattern for campaign IDs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("cid");
  const email = url.searchParams.get("e");

  // Validate inputs to prevent injection
  if (campaignId && email && UUID_REGEX.test(campaignId) && EMAIL_REGEX.test(email) && email.length <= 255) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Upsert to deduplicate opens per recipient
      const { error: insertError } = await supabase
        .from("email_opens")
        .upsert(
          { campaign_id: campaignId, recipient_email: email.toLowerCase() },
          { onConflict: "campaign_id,recipient_email" }
        );

      if (!insertError) {
        // Update aggregate count
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

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
