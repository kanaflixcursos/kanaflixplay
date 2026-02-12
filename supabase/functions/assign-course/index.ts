import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AssignCourseRequest {
  user_id: string;
  course_id: string;
}

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is admin
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerUserId = claimsData.claims.sub;

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, course_id }: AssignCourseRequest = await req.json();

    if (!user_id || !course_id) {
      return new Response(JSON.stringify({ error: 'user_id e course_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user exists
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .eq('user_id', user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify course exists
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id, title, price')
      .eq('id', course_id)
      .single();

    if (!course) {
      return new Response(JSON.stringify({ error: 'Curso não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabaseAdmin
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .maybeSingle();

    if (existingEnrollment) {
      return new Response(JSON.stringify({ error: 'Aluno já está matriculado neste curso' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create order record (simulating a completed manual purchase)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id,
        course_id,
        amount: course.price || 0,
        status: 'paid',
        payment_method: 'manual',
        paid_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(JSON.stringify({ error: 'Erro ao criar pedido' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create enrollment
    const { error: enrollError } = await supabaseAdmin
      .from('course_enrollments')
      .insert({
        user_id,
        course_id,
      });

    if (enrollError) {
      console.error('Error creating enrollment:', enrollError);
      // Rollback order
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return new Response(JSON.stringify({ error: 'Erro ao criar matrícula' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Course ${course_id} assigned to user ${user_id} by admin ${callerUserId}`);

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      message: `Curso "${course.title}" atribuído com sucesso`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
