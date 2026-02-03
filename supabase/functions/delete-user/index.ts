import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Verify the caller is an admin
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Prevent deleting yourself
    if (user_id === userData.user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Delete all related data first (cascade may not cover everything)
    await supabaseAdmin.from('orders').delete().eq('user_id', user_id);
    await supabaseAdmin.from('course_enrollments').delete().eq('user_id', user_id);
    await supabaseAdmin.from('lesson_progress').delete().eq('user_id', user_id);
    await supabaseAdmin.from('lesson_comments').delete().eq('user_id', user_id);
    await supabaseAdmin.from('notifications').delete().eq('user_id', user_id);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id);
    await supabaseAdmin.from('profiles').delete().eq('user_id', user_id);

    // Delete the user from auth.users using the Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return new Response(JSON.stringify({ 
        error: 'Failed to delete user from auth system',
        details: deleteError.message 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`User ${user_id} deleted successfully by admin ${userData.user.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User deleted successfully' 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
