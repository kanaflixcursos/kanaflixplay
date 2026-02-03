import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PAGARME_API_URL = 'https://api.pagar.me/core/v5';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAGARME_API_KEY = Deno.env.get('PAGARME_API_KEY');
    if (!PAGARME_API_KEY) {
      throw new Error('PAGARME_API_KEY not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    
    // Parse request
    const { action, ...payload } = await req.json();

    // For webhook, skip auth
    if (action === 'webhook') {
      return handleWebhook(payload, PAGARME_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    // Validate auth for other actions
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.user.id;

    switch (action) {
      case 'create_order':
        return handleCreateOrder(payload, userId, PAGARME_API_KEY, supabase);
      case 'get_payment_config':
        return handleGetPaymentConfig();
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

async function handleCreateOrder(
  payload: any, 
  userId: string, 
  apiKey: string, 
  supabase: any
) {
  const { courseId, paymentMethod, customer, card, installments = 1 } = payload;

  // Get course info
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, price')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return new Response(JSON.stringify({ error: 'Course not found' }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  if (!course.price || course.price <= 0) {
    return new Response(JSON.stringify({ error: 'Course has no price set' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Build Pagar.me order payload
  const orderPayload: any = {
    items: [{
      amount: course.price,
      description: course.title,
      quantity: 1,
      code: course.id
    }],
    customer: {
      name: customer.name,
      email: customer.email,
      document: customer.document,
      document_type: customer.document.length === 11 ? 'cpf' : 'cnpj',
      type: 'individual',
      phones: customer.phone ? {
        mobile_phone: {
          country_code: '55',
          area_code: customer.phone.substring(0, 2),
          number: customer.phone.substring(2)
        }
      } : undefined
    },
    payments: []
  };

  // Add payment method
  if (paymentMethod === 'credit_card') {
    orderPayload.payments.push({
      payment_method: 'credit_card',
      credit_card: {
        recurrence: false,
        installments,
        statement_descriptor: 'KANAFLIX',
        card: {
          number: card.number.replace(/\s/g, ''),
          holder_name: card.holderName,
          exp_month: parseInt(card.expMonth),
          exp_year: parseInt(card.expYear),
          cvv: card.cvv,
          billing_address: {
            line_1: customer.address?.line1 || 'N/A',
            zip_code: customer.address?.zipCode?.replace(/\D/g, '') || '00000000',
            city: customer.address?.city || 'N/A',
            state: customer.address?.state || 'SP',
            country: 'BR'
          }
        }
      }
    });
  } else if (paymentMethod === 'pix') {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    orderPayload.payments.push({
      payment_method: 'pix',
      pix: {
        expires_at: expiresAt.toISOString()
      }
    });
  } else if (paymentMethod === 'boleto') {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    
    orderPayload.payments.push({
      payment_method: 'boleto',
      boleto: {
        instructions: 'Pagar até o vencimento',
        due_at: dueDate.toISOString(),
        document_number: Date.now().toString().slice(-8)
      }
    });
  }

  // Create order in Pagar.me
  const authString = btoa(`${apiKey}:`);
  const pagarmeResponse = await fetch(`${PAGARME_API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderPayload)
  });

  const pagarmeOrder = await pagarmeResponse.json();

  if (!pagarmeResponse.ok) {
    console.error('Pagar.me error:', pagarmeOrder);
    return new Response(JSON.stringify({ 
      error: 'Payment processing failed', 
      details: pagarmeOrder 
    }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const charge = pagarmeOrder.charges?.[0];

  // Create order in our database
  const orderData: any = {
    user_id: userId,
    course_id: courseId,
    amount: course.price,
    status: charge?.status === 'paid' ? 'paid' : 'pending',
    payment_method: paymentMethod,
    pagarme_order_id: pagarmeOrder.id,
    pagarme_charge_id: charge?.id
  };

  // Add payment-specific data
  if (paymentMethod === 'pix' && charge?.last_transaction) {
    orderData.pix_qr_code = charge.last_transaction.qr_code;
    orderData.pix_qr_code_url = charge.last_transaction.qr_code_url;
    orderData.pix_expires_at = charge.last_transaction.expires_at;
  } else if (paymentMethod === 'boleto' && charge?.last_transaction) {
    orderData.boleto_url = charge.last_transaction.pdf;
    orderData.boleto_barcode = charge.last_transaction.line;
    orderData.boleto_due_date = charge.last_transaction.due_at?.split('T')[0];
  } else if (paymentMethod === 'credit_card' && charge?.status === 'paid') {
    orderData.paid_at = new Date().toISOString();
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  if (orderError) {
    console.error('Order insert error:', orderError);
    return new Response(JSON.stringify({ error: 'Failed to save order' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // If paid immediately (credit card), enroll user
  if (orderData.status === 'paid') {
    await enrollUser(supabase, userId, courseId);
  }

  return new Response(JSON.stringify({ 
    success: true, 
    order,
    pagarme: {
      orderId: pagarmeOrder.id,
      status: charge?.status,
      pix: paymentMethod === 'pix' ? {
        qrCode: orderData.pix_qr_code,
        qrCodeUrl: orderData.pix_qr_code_url,
        expiresAt: orderData.pix_expires_at
      } : undefined,
      boleto: paymentMethod === 'boleto' ? {
        url: orderData.boleto_url,
        barcode: orderData.boleto_barcode,
        dueDate: orderData.boleto_due_date
      } : undefined
    }
  }), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}

async function handleWebhook(
  payload: any, 
  apiKey: string,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const { type, data } = payload;

  if (type === 'charge.paid') {
    const chargeId = data.id;
    
    // Find order by charge ID
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('pagarme_charge_id', chargeId)
      .single();

    if (order && order.status !== 'paid') {
      // Update order status
      await supabase
        .from('orders')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString() 
        })
        .eq('id', order.id);

      // Enroll user in course
      if (order.course_id) {
        await enrollUser(supabase, order.user_id, order.course_id);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}

async function enrollUser(supabase: any, userId: string, courseId: string) {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();

  if (!existing) {
    await supabase
      .from('course_enrollments')
      .insert({ user_id: userId, course_id: courseId });
  }
}

function handleGetPaymentConfig() {
  // Pagar.me payment configuration - standard settings for Brazil
  const config = {
    payment_methods: [
      {
        id: 'credit_card',
        name: 'Cartão de Crédito',
        enabled: true,
        icon: 'credit-card',
        card_brands: [
          { id: 'visa', name: 'Visa', icon: '💳' },
          { id: 'mastercard', name: 'Mastercard', icon: '💳' },
          { id: 'elo', name: 'Elo', icon: '💳' },
          { id: 'amex', name: 'American Express', icon: '💳' },
          { id: 'hipercard', name: 'Hipercard', icon: '💳' },
          { id: 'diners', name: 'Diners Club', icon: '💳' },
        ],
        installments: {
          max: 12,
          min_amount_per_installment: 500, // R$ 5,00 in cents
          options: [
            { number: 1, interest_rate: 0, label: 'À vista' },
            { number: 2, interest_rate: 0, label: '2x sem juros' },
            { number: 3, interest_rate: 0, label: '3x sem juros' },
            { number: 4, interest_rate: 0, label: '4x sem juros' },
            { number: 5, interest_rate: 0, label: '5x sem juros' },
            { number: 6, interest_rate: 0, label: '6x sem juros' },
            { number: 7, interest_rate: 1.99, label: '7x com juros' },
            { number: 8, interest_rate: 1.99, label: '8x com juros' },
            { number: 9, interest_rate: 1.99, label: '9x com juros' },
            { number: 10, interest_rate: 1.99, label: '10x com juros' },
            { number: 11, interest_rate: 1.99, label: '11x com juros' },
            { number: 12, interest_rate: 1.99, label: '12x com juros' },
          ]
        }
      },
      {
        id: 'pix',
        name: 'PIX',
        enabled: true,
        icon: 'qr-code',
        description: 'Pagamento instantâneo',
        discount_percentage: 5, // Optional discount for PIX
        expires_in_minutes: 30
      },
      {
        id: 'boleto',
        name: 'Boleto Bancário',
        enabled: true,
        icon: 'barcode',
        description: 'Vencimento em 3 dias úteis',
        expires_in_days: 3
      }
    ],
    currency: {
      code: 'BRL',
      symbol: 'R$',
      decimal_separator: ',',
      thousands_separator: '.'
    },
    limits: {
      min_amount: 100, // R$ 1,00 in cents
      max_amount: 99999900 // R$ 999.999,00 in cents
    }
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
