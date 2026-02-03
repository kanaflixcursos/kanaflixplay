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
    
    const { action, ...payload } = await req.json();

    // Webhook doesn't require auth - it comes from Pagar.me
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
      case 'get_order_stats':
        return handleGetOrderStats(PAGARME_API_KEY, supabase);
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

  const orderData: any = {
    user_id: userId,
    course_id: courseId,
    amount: course.price,
    status: charge?.status === 'paid' ? 'paid' : 'pending',
    payment_method: paymentMethod,
    pagarme_order_id: pagarmeOrder.id,
    pagarme_charge_id: charge?.id
  };

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

// ===========================================
// WEBHOOK HANDLER - All Pagar.me Events
// ===========================================

async function handleWebhook(
  payload: any, 
  apiKey: string,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const { type, data } = payload;
  
  console.log(`[Webhook] Received event: ${type}`, JSON.stringify(data, null, 2));

  try {
    switch (type) {
      // Payment confirmed
      case 'charge.paid':
        await handleChargePaid(supabase, data);
        break;
      
      // Payment failed
      case 'charge.payment_failed':
        await handleChargePaymentFailed(supabase, data);
        break;
      
      // Payment refunded
      case 'charge.refunded':
        await handleChargeRefunded(supabase, data);
        break;
      
      // Payment pending (awaiting confirmation)
      case 'charge.pending':
        await handleChargePending(supabase, data);
        break;
      
      // Payment canceled
      case 'charge.canceled':
        await handleChargeCanceled(supabase, data);
        break;
      
      // Chargeback received
      case 'charge.chargedback':
        await handleChargeChargedback(supabase, data);
        break;
      
      // Order events
      case 'order.paid':
        console.log('[Webhook] Order paid - handled via charge.paid');
        break;
      
      case 'order.canceled':
        console.log('[Webhook] Order canceled');
        break;
      
      default:
        console.log(`[Webhook] Unhandled event type: ${type}`);
    }

    return new Response(JSON.stringify({ received: true, event: type }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error(`[Webhook] Error processing ${type}:`, error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Handle charge.paid event
async function handleChargePaid(supabase: any, data: any) {
  const chargeId = data.id;
  console.log(`[Webhook] Processing charge.paid for charge: ${chargeId}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('pagarme_charge_id', chargeId)
    .single();

  if (error || !order) {
    console.log(`[Webhook] Order not found for charge: ${chargeId}`);
    return;
  }

  if (order.status === 'paid') {
    console.log(`[Webhook] Order ${order.id} already paid, skipping`);
    return;
  }

  // Update order status
  await supabase
    .from('orders')
    .update({ 
      status: 'paid', 
      paid_at: new Date().toISOString() 
    })
    .eq('id', order.id);

  console.log(`[Webhook] Order ${order.id} marked as paid`);

  // Enroll user in course
  if (order.course_id) {
    await enrollUser(supabase, order.user_id, order.course_id);
    console.log(`[Webhook] User ${order.user_id} enrolled in course ${order.course_id}`);
    
    // Send success notification
    await createNotification(supabase, {
      user_id: order.user_id,
      type: 'payment_success',
      title: 'Pagamento confirmado! 🎉',
      message: `Seu pagamento para o curso "${order.courses?.title || 'curso'}" foi confirmado. Você já pode acessar o conteúdo!`,
      link: `/courses/${order.course_id}`,
      metadata: {
        order_id: order.id,
        course_id: order.course_id,
        amount: order.amount
      }
    });
  }
}

// Handle charge.payment_failed event
async function handleChargePaymentFailed(supabase: any, data: any) {
  const chargeId = data.id;
  const failureCode = data.last_transaction?.acquirer_return_code || 'unknown';
  const failureMessage = data.last_transaction?.acquirer_message || 'Pagamento não autorizado';
  
  console.log(`[Webhook] Processing charge.payment_failed for charge: ${chargeId}`);
  console.log(`[Webhook] Failure reason: ${failureCode} - ${failureMessage}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('pagarme_charge_id', chargeId)
    .single();

  if (error || !order) {
    console.log(`[Webhook] Order not found for charge: ${chargeId}`);
    return;
  }

  // Update order status
  await supabase
    .from('orders')
    .update({ status: 'failed' })
    .eq('id', order.id);

  console.log(`[Webhook] Order ${order.id} marked as failed`);

  // Notify user about failed payment
  await createNotification(supabase, {
    user_id: order.user_id,
    type: 'payment_failed',
    title: 'Pagamento não aprovado',
    message: `Seu pagamento para "${order.courses?.title || 'curso'}" não foi aprovado. Motivo: ${failureMessage}. Tente novamente com outro método de pagamento.`,
    link: `/courses/${order.course_id}`,
    metadata: {
      order_id: order.id,
      course_id: order.course_id,
      failure_code: failureCode,
      failure_message: failureMessage
    }
  });
}

// Handle charge.refunded event
async function handleChargeRefunded(supabase: any, data: any) {
  const chargeId = data.id;
  console.log(`[Webhook] Processing charge.refunded for charge: ${chargeId}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('pagarme_charge_id', chargeId)
    .single();

  if (error || !order) {
    console.log(`[Webhook] Order not found for charge: ${chargeId}`);
    return;
  }

  // Update order status
  await supabase
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', order.id);

  console.log(`[Webhook] Order ${order.id} marked as refunded`);

  // Revoke course access
  if (order.course_id) {
    await revokeEnrollment(supabase, order.user_id, order.course_id);
    console.log(`[Webhook] Revoked enrollment for user ${order.user_id} from course ${order.course_id}`);
  }

  // Notify user
  await createNotification(supabase, {
    user_id: order.user_id,
    type: 'payment_refunded',
    title: 'Reembolso processado',
    message: `O reembolso para "${order.courses?.title || 'curso'}" foi processado. O acesso ao curso foi revogado.`,
    link: null,
    metadata: {
      order_id: order.id,
      course_id: order.course_id,
      amount: order.amount
    }
  });
}

// Handle charge.pending event
async function handleChargePending(supabase: any, data: any) {
  const chargeId = data.id;
  console.log(`[Webhook] Processing charge.pending for charge: ${chargeId}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('pagarme_charge_id', chargeId)
    .single();

  if (error || !order) {
    console.log(`[Webhook] Order not found for charge: ${chargeId}`);
    return;
  }

  // Update order status if not already paid
  if (order.status !== 'paid') {
    await supabase
      .from('orders')
      .update({ status: 'pending' })
      .eq('id', order.id);
    
    console.log(`[Webhook] Order ${order.id} marked as pending`);
  }
}

// Handle charge.canceled event
async function handleChargeCanceled(supabase: any, data: any) {
  const chargeId = data.id;
  console.log(`[Webhook] Processing charge.canceled for charge: ${chargeId}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('pagarme_charge_id', chargeId)
    .single();

  if (error || !order) {
    console.log(`[Webhook] Order not found for charge: ${chargeId}`);
    return;
  }

  // Update order status
  await supabase
    .from('orders')
    .update({ status: 'canceled' })
    .eq('id', order.id);

  console.log(`[Webhook] Order ${order.id} marked as canceled`);

  // Notify user
  await createNotification(supabase, {
    user_id: order.user_id,
    type: 'payment_canceled',
    title: 'Pagamento cancelado',
    message: `Seu pagamento para "${order.courses?.title || 'curso'}" foi cancelado.`,
    link: `/courses/${order.course_id}`,
    metadata: {
      order_id: order.id,
      course_id: order.course_id
    }
  });
}

// Handle charge.chargedback event (dispute/chargeback)
async function handleChargeChargedback(supabase: any, data: any) {
  const chargeId = data.id;
  console.log(`[Webhook] Processing charge.chargedback for charge: ${chargeId}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('pagarme_charge_id', chargeId)
    .single();

  if (error || !order) {
    console.log(`[Webhook] Order not found for charge: ${chargeId}`);
    return;
  }

  // Update order status
  await supabase
    .from('orders')
    .update({ status: 'chargedback' })
    .eq('id', order.id);

  console.log(`[Webhook] Order ${order.id} marked as chargedback`);

  // Revoke course access
  if (order.course_id) {
    await revokeEnrollment(supabase, order.user_id, order.course_id);
    console.log(`[Webhook] Revoked enrollment for user ${order.user_id} due to chargeback`);
  }

  // Notify user
  await createNotification(supabase, {
    user_id: order.user_id,
    type: 'payment_chargedback',
    title: 'Contestação de pagamento',
    message: `O pagamento para "${order.courses?.title || 'curso'}" foi contestado. O acesso ao curso foi suspenso.`,
    link: null,
    metadata: {
      order_id: order.id,
      course_id: order.course_id
    }
  });
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

async function enrollUser(supabase: any, userId: string, courseId: string) {
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

async function revokeEnrollment(supabase: any, userId: string, courseId: string) {
  await supabase
    .from('course_enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
}

async function createNotification(supabase: any, notification: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: any;
}) {
  const { error } = await supabase
    .from('notifications')
    .insert(notification);

  if (error) {
    console.error('[Webhook] Failed to create notification:', error);
  } else {
    console.log(`[Webhook] Notification created for user ${notification.user_id}: ${notification.type}`);
  }
}

function handleGetPaymentConfig() {
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
          min_amount_per_installment: 500,
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
        discount_percentage: 5,
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
      min_amount: 100,
      max_amount: 99999900
    }
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleGetOrderStats(apiKey: string, supabase: any) {
  try {
    // Get stats from local orders table (more reliable)
    const { data: localOrders, error } = await supabase
      .from('orders')
      .select('status');

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    const stats = {
      total: localOrders?.length || 0,
      paid: localOrders?.filter((o: any) => o.status === 'paid').length || 0,
      refunded: (localOrders?.filter((o: any) => o.status === 'refunded').length || 0) + 
                (localOrders?.filter((o: any) => o.status === 'chargedback').length || 0),
      canceled: localOrders?.filter((o: any) => o.status === 'canceled').length || 0,
      pending: localOrders?.filter((o: any) => o.status === 'pending').length || 0,
      failed: localOrders?.filter((o: any) => o.status === 'failed').length || 0,
    };

    return new Response(JSON.stringify({ stats }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return new Response(JSON.stringify({ 
      stats: { total: 0, paid: 0, refunded: 0, canceled: 0, pending: 0, failed: 0 },
      error: 'Failed to fetch stats' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
