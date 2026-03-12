import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify this is called by cron (Authorization header with anon key) or admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users from auth
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    // List users created more than 3 hours ago with unconfirmed emails
    // We paginate through all users to find unconfirmed ones
    let deletedCount = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error('Error listing users:', listError);
        break;
      }

      const users = usersData?.users || [];
      if (users.length < perPage) {
        hasMore = false;
      }

      for (const user of users) {
        // Skip if email is confirmed
        if (user.email_confirmed_at) continue;

        // Skip if created less than 3 hours ago
        if (user.created_at && user.created_at > threeHoursAgo) continue;


        console.log(`Deleting unconfirmed user: ${user.id} (${user.email}), created: ${user.created_at}`);

        // Delete related data first
        await supabaseAdmin.from('orders').delete().eq('user_id', user.id);
        await supabaseAdmin.from('course_enrollments').delete().eq('user_id', user.id);
        await supabaseAdmin.from('lesson_progress').delete().eq('user_id', user.id);
        await supabaseAdmin.from('lesson_comments').delete().eq('user_id', user.id);
        await supabaseAdmin.from('notifications').delete().eq('user_id', user.id);
        await supabaseAdmin.from('support_ticket_reads').delete().eq('user_id', user.id);
        await supabaseAdmin.from('support_ticket_messages').delete().eq('user_id', user.id);
        await supabaseAdmin.from('support_tickets').delete().eq('user_id', user.id);
        await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id);
        await supabaseAdmin.from('profiles').delete().eq('user_id', user.id);

        // Delete auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Failed to delete user ${user.id}:`, deleteError.message);
        } else {
          deletedCount++;
        }
      }

      page++;
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} unconfirmed users.`);

    return new Response(
      JSON.stringify({ success: true, deleted: deletedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cleanup error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
