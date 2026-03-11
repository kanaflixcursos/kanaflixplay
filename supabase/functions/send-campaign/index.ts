import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Function to get all recipients for a campaign
async function getRecipients(supabase: SupabaseClient, campaign: any): Promise<{ email: string; name?: string }[]> {
  if (campaign.target_type === 'students') {
    const { data, error } = await supabase.from('profiles').select('email, full_name');
    if (error) throw error;
    return (data || []).filter(p => p.email).map(p => ({ email: p.email!, name: p.full_name || undefined }));
  }
  
  if (campaign.target_type === 'leads') {
    let query = supabase.from('leads').select('email, name');
    if (campaign.target_filters?.status && campaign.target_filters.status !== 'all') {
      query = query.eq('status', campaign.target_filters.status);
    }
    if (campaign.target_filters?.tag) {
      query = query.contains('tags', [campaign.target_filters.tag]);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as { email: string; name?: string }[];
  }

  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { campaignId } = await req.json();
    if (!campaignId) throw new Error("campaignId is required");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch Campaign and validate status
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (fetchError || !campaign) throw new Error("Campaign not found");
    if (campaign.status !== 'draft') throw new Error("Campaign is not a draft and cannot be sent.");

    // 2. Get all recipients
    const recipients = await getRecipients(supabaseAdmin, campaign);
    if (recipients.length === 0) {
      await supabaseAdmin.from('email_campaigns').update({ status: 'failed', failed_count: 0, sent_count: 0, total_recipients: 0 }).eq('id', campaignId);
      return new Response(JSON.stringify({ message: "No recipients found for this campaign." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404
      });
    }

    // 3. Update campaign status to 'sending'
    await supabaseAdmin.from('email_campaigns').update({ status: 'sending', total_recipients: recipients.length }).eq('id', campaignId);

    // 4. Asynchronously send emails in batches
    // We don't await this so the client gets a quick response. The sending happens in the background.
    (async () => {
      let sentCount = 0;
      let failedCount = 0;
      const batchSize = 10; // Process 10 emails concurrently

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const promises = batch.map(recipient => 
          supabaseAdmin.functions.invoke('send-email', {
            body: {
              action: 'campaign',
              to: recipient.email,
              data: {
                subject: campaign.subject,
                htmlContent: campaign.html_content,
                recipientName: recipient.name || '',
                campaignId: campaign.id,
                campaignTag: campaign.tag || ''
              },
            },
          })
        );
        
        const results = await Promise.allSettled(promises);
        results.forEach(result => {
          if (result.status === 'fulfilled' && !result.value.error) {
            sentCount++;
          } else {
            failedCount++;
          }
        });
      }

      // 5. Final update of campaign status
      const finalStatus = failedCount === recipients.length ? 'failed' : 'sent';
      await supabaseAdmin.from('email_campaigns').update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      }).eq('id', campaign.id);

    })().catch(err => {
      console.error(`[FATAL] Background campaign send failed for ${campaignId}:`, err);
       supabaseAdmin.from('email_campaigns').update({ status: 'failed' }).eq('id', campaignId);
    });

    return new Response(JSON.stringify({ message: `Campaign sending started for ${recipients.length} recipients.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
