import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 1x1 transparent GIF
const PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0));

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("cid");
  const email = url.searchParams.get("e");

  if (campaignId && email) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Upsert to deduplicate opens per recipient
      const { error: insertError } = await supabase
        .from("email_opens")
        .upsert(
          { campaign_id: campaignId, recipient_email: email },
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
    } catch (err) {
      console.error("Tracking error:", err);
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
