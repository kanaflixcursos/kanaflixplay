import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PAGARME_API_URL = 'https://api.pagar.me/core/v5';

Deno.serve(async (req) => {
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
    
    const body = await req.json();
    
    // Auto-detect webhook from Pagar.me
    const isWebhook = body.type && typeof body.type === 'string' && 
                      (body.type.startsWith('charge.') || body.type.startsWith('order.'));
    
    if (isWebhook) {
      console.log(`[Webhook] Auto-detected Pagar.me webhook: ${body.type}`);
      
      const chargeId = body.data?.id;
      if (!chargeId) {
        console.error('[Webhook] Missing charge/order ID in webhook payload');
        return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (body.type.startsWith('charge.')) {
        const authString = btoa(`${PAGARME_API_KEY}:`);
        const verifyResponse = await fetch(`${PAGARME_API_URL}/charges/${chargeId}`, {
          headers: { 'Authorization': `Basic ${authString}` }
        });
        
        if (!verifyResponse.ok) {
          console.error(`[Webhook] Charge verification failed: ${chargeId} - status ${verifyResponse.status}`);
          return new Response(JSON.stringify({ error: 'Webhook verification failed' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        
        const verifiedCharge = await verifyResponse.json();
        console.log(`[Webhook] Charge ${chargeId} verified with status: ${verifiedCharge.status}`);
        body.data = verifiedCharge;
      }

      return handleWebhook(body, PAGARME_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
    
    const { action, ...payload } = body;

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub as string;
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Helper to check admin role
    const checkAdmin = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      return roleData?.role === 'admin';
    };

    switch (action) {
      case 'create_order':
        return handleCreateOrder(payload, userId, PAGARME_API_KEY, adminSupabase);
      case 'get_payment_config':
        return handleGetPaymentConfig();
      case 'get_order_stats': {
        if (!(await checkAdmin())) {
          return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { 
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        return handleGetOrderStats(PAGARME_API_KEY, adminSupabase);
      }
      case 'get_orders_analytics': {
        if (!(await checkAdmin())) {
          return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { 
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        return handleGetOrdersAnalytics(adminSupabase, payload.month);
      }
      case 'get_order_details': {
        if (!(await checkAdmin())) {
          return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { 
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        return handleGetOrderDetails(payload, PAGARME_API_KEY, adminSupabase);
      }
      case 'refund_order': {
        if (!(await checkAdmin())) {
          return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { 
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        return handleRefundOrder(payload, PAGARME_API_KEY, adminSupabase);
      }
      case 'cancel_order': {
        if (!(await checkAdmin())) {
          return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { 
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        return handleCancelOrder(payload, PAGARME_API_KEY, adminSupabase);
      }
      case 'request_refund': {
        // Authenticated user can request refund for their own order — auto-processed
        return handleRequestRefund(payload, userId, PAGARME_API_KEY, adminSupabase);
      }
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
  const { courseId, comboId, paymentMethod, customer, card, installments = 1, couponId } = payload;

  // Validate payment method
  const validPaymentMethods = ['credit_card', 'pix', 'boleto'];
  if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
    return new Response(JSON.stringify({ error: 'Invalid payment method' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Validate installments
  const parsedInstallments = Number(installments);
  if (!Number.isInteger(parsedInstallments) || parsedInstallments < 1 || parsedInstallments > 12) {
    return new Response(JSON.stringify({ error: 'Installments must be between 1 and 12' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Validate required customer fields
  if (!customer || !customer.name || !customer.email || !customer.document) {
    return new Response(JSON.stringify({ error: 'Customer name, email, and document are required' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Validate address
  if (!customer.address || !customer.address.zipCode || !customer.address.street || !customer.address.number || !customer.address.neighborhood || !customer.address.city || !customer.address.state) {
    return new Response(JSON.stringify({ error: 'Address fields are required (zipCode, street, number, neighborhood, city, state)' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Validate customer document (CPF: 11 digits, CNPJ: 14 digits)
  const cleanDoc = String(customer.document).replace(/\D/g, '');
  if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
    return new Response(JSON.stringify({ error: 'Invalid document (CPF or CNPJ)' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customer.email)) {
    return new Response(JSON.stringify({ error: 'Invalid customer email' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // Validate card fields for credit card payments
  if (paymentMethod === 'credit_card') {
    if (!card || !card.number || !card.holderName || !card.expMonth || !card.expYear || !card.cvv) {
      return new Response(JSON.stringify({ error: 'Card details are required for credit card payments' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }

  // Handle combo or single course
  let itemTitle: string;
  let itemPrice: number;
  let itemId: string;
  let comboCourseIds: string[] = [];

  if (comboId) {
    const { data: combo, error: comboError } = await supabase
      .from('combos')
      .select('id, title, price, max_installments')
      .eq('id', comboId)
      .eq('is_active', true)
      .single();

    if (comboError || !combo) {
      return new Response(JSON.stringify({ error: 'Combo not found' }), { 
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!combo.price || combo.price <= 0) {
      return new Response(JSON.stringify({ error: 'Combo has no price set' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validate installments against combo max
    if (parsedInstallments > (combo.max_installments || 12)) {
      return new Response(JSON.stringify({ error: `Max installments for this combo is ${combo.max_installments}` }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get combo courses
    const { data: cc } = await supabase
      .from('combo_courses')
      .select('course_id')
      .eq('combo_id', comboId);
    comboCourseIds = (cc || []).map((c: any) => c.course_id);

    itemTitle = combo.title;
    itemPrice = combo.price;
    itemId = combo.id;
  } else {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), { 
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!course.price || course.price <= 0) {
      return new Response(JSON.stringify({ error: 'Course has no price set' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    itemTitle = course.title;
    itemPrice = course.price;
    itemId = course.id;
  }

  // Server-side coupon validation
  let finalPrice = itemPrice;
  let discountAmount = 0;
  let validatedCouponId: string | null = null;

  if (couponId) {
    const { data: coupon, error: couponError } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('id', couponId)
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return new Response(JSON.stringify({ error: 'Cupom inválido ou inativo' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Cupom expirado' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return new Response(JSON.stringify({ error: 'Cupom atingiu o limite de uso' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check course restriction
    const couponCourseIds: string[] = coupon.course_ids && coupon.course_ids.length > 0
      ? coupon.course_ids
      : (coupon.course_id ? [coupon.course_id] : []);
    
    if (couponCourseIds.length > 0 && !couponCourseIds.includes(courseId)) {
      return new Response(JSON.stringify({ error: 'Cupom não válido para este curso' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check payment method restriction
    const couponPaymentMethods: string[] = coupon.payment_methods || [];
    if (couponPaymentMethods.length > 0 && !couponPaymentMethods.includes(paymentMethod)) {
      return new Response(JSON.stringify({ error: 'Cupom não válido para esta forma de pagamento' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.round(itemPrice * (coupon.discount_value / 100));
    } else {
      discountAmount = coupon.discount_value;
    }

    finalPrice = Math.max(0, itemPrice - discountAmount);
    validatedCouponId = coupon.id;

    // Increment used_count
    await supabase
      .from('discount_coupons')
      .update({ used_count: coupon.used_count + 1 })
      .eq('id', coupon.id);

    console.log(`[Order] Coupon ${coupon.code} applied: discount ${discountAmount}, final price ${finalPrice}`);
  }

  // Apply 3% PIX discount
  let pixDiscount = 0;
  if (paymentMethod === 'pix' && finalPrice > 0) {
    pixDiscount = Math.round(finalPrice * 0.03);
    finalPrice = Math.max(0, finalPrice - pixDiscount);
    console.log(`[Order] PIX 3% discount applied: -${pixDiscount}, final price ${finalPrice}`);
  }

  // Apply installment interest for credit card (exact multipliers: 1 / (1 - C.E.T))
  if (paymentMethod === 'credit_card' && parsedInstallments > 1) {
    const INSTALLMENT_MULTIPLIERS: Record<number, number> = {
      1: 1.00000, 2: 1.04493, 3: 1.05496, 4: 1.06519, 5: 1.07562, 6: 1.08625,
      7: 1.10595, 8: 1.11707, 9: 1.12854, 10: 1.14012, 11: 1.15194, 12: 1.16401
    };
    const multiplier = INSTALLMENT_MULTIPLIERS[parsedInstallments] || 1;
    const basePriceReais = finalPrice / 100;
    const totalWithInterest = Number((basePriceReais * multiplier).toFixed(2));
    const priceWithInterest = Math.round(totalWithInterest * 100);
    console.log(`[Order] Installment interest applied: ${parsedInstallments}x, multiplier ${multiplier}, base ${finalPrice} -> total ${priceWithInterest}`);
    finalPrice = priceWithInterest;
  }

  // If price is 0 after discount, auto-enroll without payment
  if (finalPrice <= 0) {
    const orderData: any = {
      id: `free_${Date.now()}`,
      user_id: userId,
      course_id: comboId ? null : courseId,
      combo_id: comboId || null,
      amount: 0,
      discount_amount: discountAmount + pixDiscount,
      coupon_id: validatedCouponId,
      status: 'paid',
      payment_method: 'coupon',
      paid_at: new Date().toISOString(),
    };

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

    // Enroll in all courses (combo or single)
    const enrollCourseIds = comboId ? comboCourseIds : [courseId];
    for (const cid of enrollCourseIds) {
      await enrollUser(supabase, userId, cid);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      order,
      pagarme: { status: 'paid' }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const orderPayload: any = {
    items: [{
      amount: finalPrice,
      description: itemTitle,
      quantity: 1,
      code: itemId
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
      } : undefined,
      address: {
        line_1: `${customer.address.number}, ${customer.address.street}`,
        line_2: [customer.address.complement, customer.address.neighborhood].filter(Boolean).join(', ') || undefined,
        zip_code: customer.address.zipCode.replace(/\D/g, ''),
        city: customer.address.city,
        state: customer.address.state,
        country: 'BR'
      }
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
            line_1: `${customer.address.number}, ${customer.address.street}`,
            line_2: [customer.address.complement, customer.address.neighborhood].filter(Boolean).join(', ') || undefined,
            zip_code: customer.address.zipCode.replace(/\D/g, ''),
            city: customer.address.city,
            state: customer.address.state,
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

  let failureReason: string | null = null;
  if (charge?.status === 'failed') {
    const gatewayErrors = charge.last_transaction?.gateway_response?.errors;
    if (gatewayErrors && gatewayErrors.length > 0) {
      failureReason = gatewayErrors.map((e: any) => e.message).join('; ');
    } else {
      failureReason = 'Pagamento recusado pelo gateway';
    }
  }

  const orderData: any = {
    id: pagarmeOrder.id,
    user_id: userId,
    course_id: comboId ? null : courseId,
    combo_id: comboId || null,
    amount: finalPrice,
    discount_amount: (discountAmount + pixDiscount) > 0 ? (discountAmount + pixDiscount) : null,
    coupon_id: validatedCouponId,
    status: charge?.status === 'paid' ? 'paid' : charge?.status === 'failed' ? 'failed' : 'pending',
    payment_method: paymentMethod,
    pagarme_charge_id: charge?.id,
    failure_reason: failureReason,
    installments: paymentMethod === 'credit_card' ? installments : 1,
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', userId)
    .single();

  if (orderData.status === 'paid') {
    // Enroll in all courses (combo or single)
    const enrollCourseIds = comboId ? comboCourseIds : [courseId];
    for (const cid of enrollCourseIds) {
      await enrollUser(supabase, userId, cid);
    }
    
    if (profile?.email) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      await sendEmail(SUPABASE_URL, {
        action: 'purchase_confirmation',
        to: profile.email,
        data: {
          userName: profile.full_name || '',
          courseName: itemTitle,
          courseUrl: comboId ? `https://cursos.kanaflix.com.br/courses` : `https://cursos.kanaflix.com.br/courses/${courseId}`,
          amount: order.amount,
          paymentMethod: 'Cartão de Crédito',
          orderId: order.id,
          installments: order.installments || 1,
        }
      });
    }
  } else if ((paymentMethod === 'pix' || paymentMethod === 'boleto') && profile?.email) {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    await sendEmail(SUPABASE_URL, {
      action: 'payment_pending',
      to: profile.email,
      data: {
        userName: profile.full_name || '',
        courseName: itemTitle,
        amount: itemPrice,
        paymentMethod: paymentMethod as 'pix' | 'boleto',
        pixQrCode: orderData.pix_qr_code,
        pixQrCodeUrl: orderData.pix_qr_code_url,
        boletoUrl: orderData.boleto_url,
        boletoBarcode: orderData.boleto_barcode,
        expiresAt: orderData.pix_expires_at 
          ? new Date(orderData.pix_expires_at).toLocaleString('pt-BR')
          : undefined,
      }
    });
  }

  // If the charge failed immediately, restore coupon usage
  if (charge?.status === 'failed' && validatedCouponId) {
    await restoreCouponUsage(supabase, validatedCouponId);
  }

  if (charge?.status === 'failed') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Pagamento não autorizado',
      failureReason,
      order,
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
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
      case 'charge.paid':
        await handleChargePaid(supabase, data);
        break;
      case 'charge.payment_failed':
        await handleChargePaymentFailed(supabase, data);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(supabase, data);
        break;
      case 'charge.pending':
        await handleChargePending(supabase, data);
        break;
      case 'charge.canceled':
        await handleChargeCanceled(supabase, data);
        break;
      case 'charge.chargedback':
        await handleChargeChargedback(supabase, data);
        break;
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

async function handleChargePaid(supabase: any, data: any) {
  const chargeId = data.id;
  console.log(`[Webhook] Processing charge.paid for charge: ${chargeId}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title), combos(title)')
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

  await supabase
    .from('orders')
    .update({ 
      status: 'paid', 
      paid_at: new Date().toISOString() 
    })
    .eq('id', order.id);

  console.log(`[Webhook] Order ${order.id} marked as paid`);

  // Determine courses to enroll
  let enrollCourseIds: string[] = [];
  let itemTitle = 'Curso';

  if (order.combo_id) {
    const { data: cc } = await supabase
      .from('combo_courses')
      .select('course_id')
      .eq('combo_id', order.combo_id);
    enrollCourseIds = (cc || []).map((c: any) => c.course_id);
    itemTitle = order.combos?.title || 'Combo';
  } else if (order.course_id) {
    enrollCourseIds = [order.course_id];
    itemTitle = order.courses?.title || 'Curso';
  }

  if (enrollCourseIds.length > 0) {
    for (const cid of enrollCourseIds) {
      await enrollUser(supabase, order.user_id, cid);
    }
    console.log(`[Webhook] User ${order.user_id} enrolled in ${enrollCourseIds.length} course(s)`);
    
    const profile = await getUserProfile(supabase, order.user_id);
    
    if (profile?.email) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const paymentMethodLabel = order.payment_method === 'credit_card' 
        ? 'Cartão de Crédito' 
        : order.payment_method === 'pix' 
          ? 'PIX' 
          : 'Boleto';
      
      await sendEmail(SUPABASE_URL, {
        action: 'purchase_confirmation',
        to: profile.email,
        data: {
          userName: profile.full_name || '',
          courseName: itemTitle,
          courseUrl: order.combo_id 
            ? `https://cursos.kanaflix.com.br/courses` 
            : `https://cursos.kanaflix.com.br/courses/${order.course_id}`,
          amount: order.amount,
          paymentMethod: paymentMethodLabel,
          orderId: order.id,
          installments: order.installments || 1,
        }
      });
    }
    
    await createNotification(supabase, {
      user_id: order.user_id,
      type: 'payment_success',
      title: 'Pagamento confirmado! 🎉',
      message: `Seu pagamento para "${itemTitle}" foi confirmado. Você já pode acessar o conteúdo!`,
      link: order.combo_id ? `/courses` : `/courses/${order.course_id}`,
      metadata: {
        order_id: order.id,
        course_id: order.course_id,
        combo_id: order.combo_id,
        amount: order.amount
      }
    });
  }
}

async function handleChargePaymentFailed(supabase: any, data: any) {
  const chargeId = data.id;
  const failureCode = data.last_transaction?.acquirer_return_code || 'unknown';
  const failureMessage = data.last_transaction?.acquirer_message || 'Pagamento não autorizado';
  
  console.log(`[Webhook] Processing charge.payment_failed for charge: ${chargeId}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('pagarme_charge_id', chargeId)
    .single();

  if (error || !order) {
    console.log(`[Webhook] Order not found for charge: ${chargeId}`);
    return;
  }

  await supabase
    .from('orders')
    .update({ status: 'failed' })
    .eq('id', order.id);

  // Restore coupon usage on payment failure
  if (order.coupon_id) {
    await restoreCouponUsage(supabase, order.coupon_id);
    console.log(`[Webhook] Restored coupon usage for coupon ${order.coupon_id} (payment failed)`);
  }

  console.log(`[Webhook] Order ${order.id} marked as failed`);

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

async function handleChargeRefunded(supabase: any, data: any) {
  const chargeId = data.id;
  console.log(`[Webhook] Processing charge.refunded for charge: ${chargeId}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title), combos(title)')
    .eq('pagarme_charge_id', chargeId)
    .single();

  if (error || !order) {
    console.log(`[Webhook] Order not found for charge: ${chargeId}`);
    return;
  }

  await supabase
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', order.id);

  if (order.coupon_id) {
    await restoreCouponUsage(supabase, order.coupon_id);
  }

  console.log(`[Webhook] Order ${order.id} marked as refunded`);

  // Revoke enrollments (combo or single)
  if (order.combo_id) {
    const { data: cc } = await supabase.from('combo_courses').select('course_id').eq('combo_id', order.combo_id);
    for (const c of (cc || [])) {
      await revokeEnrollment(supabase, order.user_id, c.course_id);
    }
  } else if (order.course_id) {
    await revokeEnrollment(supabase, order.user_id, order.course_id);
  }

  const itemTitle = order.combo_id ? (order.combos?.title || 'Combo') : (order.courses?.title || 'Curso');
  const profile = await getUserProfile(supabase, order.user_id);
  
  if (profile?.email) {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    await sendEmail(SUPABASE_URL, {
      action: 'refund_confirmation',
      to: profile.email,
      data: {
        userName: profile.full_name || '',
        courseName: itemTitle,
        amount: order.amount,
        orderId: order.id,
      }
    });
  }

  await createNotification(supabase, {
    user_id: order.user_id,
    type: 'payment_refunded',
    title: 'Reembolso processado',
    message: `O reembolso para "${itemTitle}" foi processado. O acesso foi revogado.`,
    link: null,
    metadata: {
      order_id: order.id,
      course_id: order.course_id,
      combo_id: order.combo_id,
      amount: order.amount
    }
  });
}

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

  if (order.status !== 'paid') {
    await supabase
      .from('orders')
      .update({ status: 'pending' })
      .eq('id', order.id);
    
    console.log(`[Webhook] Order ${order.id} marked as pending`);
  }
}

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

  await supabase
    .from('orders')
    .update({ status: 'canceled' })
    .eq('id', order.id);

  // Restore coupon usage on cancellation
  if (order.coupon_id) {
    await restoreCouponUsage(supabase, order.coupon_id);
    console.log(`[Webhook] Restored coupon usage for coupon ${order.coupon_id} (canceled)`);
  }

  console.log(`[Webhook] Order ${order.id} marked as canceled`);

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

  await supabase
    .from('orders')
    .update({ status: 'chargedback' })
    .eq('id', order.id);

  // Restore coupon usage on chargeback
  if (order.coupon_id) {
    await restoreCouponUsage(supabase, order.coupon_id);
    console.log(`[Webhook] Restored coupon usage for coupon ${order.coupon_id} (chargedback)`);
  }

  console.log(`[Webhook] Order ${order.id} marked as chargedback`);

  if (order.course_id) {
    await revokeEnrollment(supabase, order.user_id, order.course_id);
    console.log(`[Webhook] Revoked enrollment for user ${order.user_id} due to chargeback`);
  }

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

async function restoreCouponUsage(supabase: any, couponId: string) {
  try {
    const { data: coupon } = await supabase
      .from('discount_coupons')
      .select('used_count')
      .eq('id', couponId)
      .single();
    
    if (coupon && coupon.used_count > 0) {
      await supabase
        .from('discount_coupons')
        .update({ used_count: coupon.used_count - 1 })
        .eq('id', couponId);
      console.log(`[Coupon] Restored usage for coupon ${couponId}, new count: ${coupon.used_count - 1}`);
    }
  } catch (error) {
    console.error(`[Coupon] Error restoring usage for coupon ${couponId}:`, error);
  }
}

async function sendEmail(supabaseUrl: string, data: {
  action: 'welcome' | 'purchase_confirmation' | 'payment_pending' | 'refund_confirmation';
  to: string;
  data: Record<string, unknown>;
}) {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.log('[Email] RESEND_API_KEY not configured, skipping email');
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Email] Failed to send email:', error);
    } else {
      console.log(`[Email] Email sent successfully: ${data.action} to ${data.to}`);
    }
  } catch (error) {
    console.error('[Email] Error sending email:', error);
  }
}

async function getUserProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', userId)
    .single();
  return data;
}

async function enrollUser(supabase: any, userId: string, courseId: string) {
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();

  if (!existing) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const { error } = await supabase
      .from('course_enrollments')
      .insert({ user_id: userId, course_id: courseId, expires_at: expiresAt.toISOString() });
    if (error) {
      console.error(`[Enrollment] Failed to enroll user ${userId} in course ${courseId}:`, error);
    } else {
      console.log(`[Enrollment] User ${userId} enrolled in course ${courseId}`);
    }
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
          progressive_rates: {
            installment_1: 3.25,
            installment_2_to_6: 3.79,
            installment_7_to_12: 4.07,
          },
          options: [
            { number: 1, label: 'À vista' },
            { number: 2, label: '2x sem juros' },
            { number: 3, label: '3x sem juros' },
            { number: 4, label: '4x sem juros' },
            { number: 5, label: '5x sem juros' },
            { number: 6, label: '6x sem juros' },
            { number: 7, label: '7x com juros' },
            { number: 8, label: '8x com juros' },
            { number: 9, label: '9x com juros' },
            { number: 10, label: '10x com juros' },
            { number: 11, label: '11x com juros' },
            { number: 12, label: '12x com juros' },
          ]
        }
      },
      {
        id: 'pix',
        name: 'PIX',
        enabled: true,
        icon: 'qr-code',
        description: 'Pagamento instantâneo',
        discount_percentage: 0,
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

async function handleRefundOrder(
  payload: any,
  apiKey: string,
  supabase: any
) {
  const { orderId } = payload;

  if (!orderId) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (order.status !== 'paid') {
    return new Response(JSON.stringify({ error: 'Only paid orders can be refunded' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!order.pagarme_charge_id) {
    return new Response(JSON.stringify({ error: 'No Pagar.me charge ID found for this order' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authString = btoa(`${apiKey}:`);
  
  try {
    const refundResponse = await fetch(`${PAGARME_API_URL}/charges/${order.pagarme_charge_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });

    const refundData = await refundResponse.json();

    if (!refundResponse.ok) {
      console.error('Pagar.me refund error:', refundData);
      return new Response(JSON.stringify({ 
        error: 'Failed to process refund with Pagar.me',
        details: refundData
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', orderId);

    // Restore coupon usage on refund
    if (order.coupon_id) {
      await restoreCouponUsage(supabase, order.coupon_id);
    }

    if (order.course_id) {
      await supabase
        .from('course_enrollments')
        .delete()
        .eq('user_id', order.user_id)
        .eq('course_id', order.course_id);

      // Deduct points_reward from user profile
      const { data: courseData } = await supabase
        .from('courses')
        .select('points_reward')
        .eq('id', order.course_id)
        .single();

      if (courseData?.points_reward > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('points')
          .eq('user_id', order.user_id)
          .single();

        const newPts = Math.max(0, (profileData?.points || 0) - courseData.points_reward);
        await supabase
          .from('profiles')
          .update({ points: newPts })
          .eq('user_id', order.user_id);

        console.log(`[Refund] Deducted ${courseData.points_reward} points from user ${order.user_id}`);
      }
    }

    await supabase
      .from('notifications')
      .insert({
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

    console.log(`[Refund] Order ${orderId} refunded successfully`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Refund processed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Refund error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process refund' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleCancelOrder(
  payload: any,
  apiKey: string,
  supabase: any
) {
  const { orderId } = payload;

  if (!orderId) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (order.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Only pending orders can be canceled' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (order.pagarme_charge_id) {
    const authString = btoa(`${apiKey}:`);
    
    try {
      const cancelResponse = await fetch(`${PAGARME_API_URL}/charges/${order.pagarme_charge_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json'
        }
      });

      if (!cancelResponse.ok) {
        const cancelData = await cancelResponse.json();
        console.log('Pagar.me cancel response:', cancelData);
      }
    } catch (error) {
      console.log('Error canceling charge in Pagar.me:', error);
    }
  }

  await supabase
    .from('orders')
    .update({ status: 'canceled' })
    .eq('id', orderId);

  // Restore coupon usage on cancellation
  if (order.coupon_id) {
    await restoreCouponUsage(supabase, order.coupon_id);
  }

  await supabase
    .from('notifications')
    .insert({
      user_id: order.user_id,
      type: 'payment_canceled',
      title: 'Pedido cancelado',
      message: `O pedido para "${order.courses?.title || 'curso'}" foi cancelado pelo administrador.`,
      link: null,
      metadata: {
        order_id: order.id,
        course_id: order.course_id
      }
    });

  console.log(`[Cancel] Order ${orderId} canceled successfully`);

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Order canceled successfully'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleRequestRefund(
  payload: any,
  userId: string,
  apiKey: string,
  supabase: any
) {
  const { orderId, reason } = payload;

  if (!orderId || !reason?.trim()) {
    return new Response(JSON.stringify({ error: 'Order ID and reason are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Fetch order and verify ownership
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, courses(title)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (order.user_id !== userId) {
    return new Response(JSON.stringify({ error: 'You can only request refunds for your own orders' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (order.status !== 'paid') {
    return new Response(JSON.stringify({ error: 'Only paid orders can be refunded' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Check if refund already requested
  const { data: existingRefund } = await supabase
    .from('refund_requests')
    .select('id, status')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existingRefund) {
    return new Response(JSON.stringify({ error: 'A refund request already exists for this order' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!order.pagarme_charge_id) {
    return new Response(JSON.stringify({ error: 'No payment charge found for this order' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Process refund via Pagar.me
  const authString = btoa(`${apiKey}:`);

  try {
    const refundResponse = await fetch(`${PAGARME_API_URL}/charges/${order.pagarme_charge_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });

    const refundData = await refundResponse.json();

    if (!refundResponse.ok) {
      console.error('[AutoRefund] Pagar.me refund error:', refundData);
      return new Response(JSON.stringify({ 
        error: 'Falha ao processar reembolso no gateway de pagamento',
        details: refundData
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', orderId);

    // Create refund request record (already approved)
    await supabase
      .from('refund_requests')
      .insert({
        order_id: orderId,
        user_id: userId,
        reason: reason.trim(),
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      });

    // Restore coupon usage
    if (order.coupon_id) {
      await restoreCouponUsage(supabase, order.coupon_id);
    }

    // Revoke enrollment and deduct course points
    if (order.course_id) {
      await supabase
        .from('course_enrollments')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', order.course_id);

      // Deduct points_reward from user profile
      const { data: course } = await supabase
        .from('courses')
        .select('points_reward')
        .eq('id', order.course_id)
        .single();

      if (course?.points_reward > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('points')
          .eq('user_id', userId)
          .single();

        const newPoints = Math.max(0, (profile?.points || 0) - course.points_reward);
        await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('user_id', userId);

        console.log(`[AutoRefund] Deducted ${course.points_reward} points from user ${userId}`);
      }
    }

    // Notify user
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'payment_refunded',
        title: 'Reembolso processado',
        message: `Seu reembolso para "${order.courses?.title || 'curso'}" foi processado automaticamente. O valor será devolvido conforme a forma de pagamento original.`,
        link: '/purchases',
        metadata: {
          order_id: orderId,
          course_id: order.course_id,
          amount: order.amount
        }
      });

    console.log(`[AutoRefund] Order ${orderId} refunded automatically for user ${userId}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Reembolso processado com sucesso'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[AutoRefund] Error:', error);
    return new Response(JSON.stringify({ error: 'Erro ao processar reembolso' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetOrdersAnalytics(supabase: any, month?: string) {
  try {
    // month format: "YYYY-MM" or undefined (defaults to current month)
    let periodStart: Date;
    let periodEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;

    if (month === 'all') {
      // All-time: no date filter
      periodStart = new Date(2000, 0, 1);
      periodEnd = new Date();
      // No meaningful "previous" for all-time — use empty range
      prevStart = new Date(2000, 0, 1);
      prevEnd = new Date(2000, 0, 1);
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      periodStart = new Date(y, m - 1, 1);
      periodEnd = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
      // Previous = previous month
      prevStart = new Date(y, m - 2, 1);
      prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = now;
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    // Fetch all orders
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('id, amount, status, payment_method, paid_at, created_at, course_id, user_id, installments, courses(title)');

    if (error) throw error;

    const orders = allOrders || [];

    const inPeriod = (d: string) => { const dt = new Date(d); return dt >= periodStart && dt <= periodEnd; };
    const inPrev = (d: string) => { const dt = new Date(d); return dt >= prevStart && dt <= prevEnd; };

    const current = orders.filter((o: any) => inPeriod(o.created_at));
    const previous = orders.filter((o: any) => inPrev(o.created_at));

    // --- Revenue ---
    // Fees: PIX 0.79%, Boleto R$2.79, Credit 1x 3.25% / 2-6x 3.79% / 7-12x 4.07%
    // Gateway R$0.35 + Antifraude R$0.35 = R$0.70 fixed per tx
    const FIXED_FEE = 70; // R$0.35 gateway + R$0.35 antifraude
    const calcNet = (amount: number, pm: string | null) => {
      switch (pm) {
        case 'pix': return amount - Math.round(amount * 0.79 / 100) - FIXED_FEE;
        case 'boleto': return amount - 279 - FIXED_FEE;
        case 'credit_card': return amount - Math.round(amount * 3.25 / 100) - FIXED_FEE;
        default: return amount - FIXED_FEE;
      }
    };

    const paidCurrent = current.filter((o: any) => o.status === 'paid');
    const paidPrevious = previous.filter((o: any) => o.status === 'paid');

    const grossCurrent = paidCurrent.reduce((s: number, o: any) => s + (o.amount || 0), 0);
    const grossPrevious = paidPrevious.reduce((s: number, o: any) => s + (o.amount || 0), 0);
    const netCurrent = paidCurrent.reduce((s: number, o: any) => s + calcNet(o.amount || 0, o.payment_method), 0);

    // --- Order stats ---
    const countByStatus = (list: any[]) => ({
      total: list.length,
      paid: list.filter((o: any) => o.status === 'paid').length,
      pending: list.filter((o: any) => o.status === 'pending').length,
      refunded: list.filter((o: any) => o.status === 'refunded' || o.status === 'chargedback').length,
      canceled: list.filter((o: any) => o.status === 'canceled').length,
      free: list.filter((o: any) => o.status === 'free').length,
    });
    const statsCurrent = countByStatus(current);
    const statsPrevious = countByStatus(previous);

    // --- Average ticket (exclude free) ---
    const avgTicketCurrent = paidCurrent.length > 0 ? Math.round(paidCurrent.reduce((s: number, o: any) => s + o.amount, 0) / paidCurrent.length) : 0;
    const avgTicketPrevious = paidPrevious.length > 0 ? Math.round(paidPrevious.reduce((s: number, o: any) => s + o.amount, 0) / paidPrevious.length) : 0;

    // Top selling courses (paid only, all time)
    const paidAllTime = orders.filter((o: any) => o.status === 'paid' && o.amount > 0);
    const courseCount: Record<string, { title: string; count: number; revenue: number }> = {};
    for (const o of paidAllTime) {
      const cid = o.course_id;
      if (!cid) continue;
      if (!courseCount[cid]) courseCount[cid] = { title: o.courses?.title || 'Curso', count: 0, revenue: 0 };
      courseCount[cid].count++;
      courseCount[cid].revenue += o.amount || 0;
    }
    const topCourses = Object.values(courseCount).sort((a, b) => b.count - a.count).slice(0, 3);

    // --- Sales origin: lead sources for converted leads ---
    const { data: leads } = await supabase
      .from('leads')
      .select('source, status, form_id, converted_at');

    // Filter converted leads in current period
    const convertedCurrent = (leads || []).filter((l: any) => l.status === 'converted' && l.converted_at && inPeriod(l.converted_at));
    const convertedPrevious = (leads || []).filter((l: any) => l.status === 'converted' && l.converted_at && inPrev(l.converted_at));

    // Get form slugs for form-originated leads
    const formIds = [...new Set(convertedCurrent.filter((l: any) => l.source === 'form' && l.form_id).map((l: any) => l.form_id))];
    let formSlugs: Record<string, string> = {};
    if (formIds.length > 0) {
      const { data: forms } = await supabase
        .from('lead_forms')
        .select('id, slug')
        .in('id', formIds);
      for (const f of (forms || [])) {
        formSlugs[f.id] = f.slug;
      }
    }

    // Build source breakdown using form slug when available
    const sourceCount: Record<string, number> = {};
    for (const l of convertedCurrent) {
      let label = l.source;
      if (l.source === 'form' && l.form_id && formSlugs[l.form_id]) {
        label = formSlugs[l.form_id];
      }
      sourceCount[label] = (sourceCount[label] || 0) + 1;
    }
    const topSources = Object.entries(sourceCount)
      .map(([source, count]) => ({ source, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalConverted = convertedCurrent.length;
    const prevTotalConverted = convertedPrevious.length;

    return new Response(JSON.stringify({
      revenue: { gross: grossCurrent, net: Math.max(0, netCurrent), previousGross: grossPrevious },
      orders: { current: statsCurrent, previous: statsPrevious },
      avgTicket: { current: avgTicketCurrent, previous: avgTicketPrevious, topCourses },
      salesOrigin: { sources: topSources, totalConverted, previousTotalConverted: prevTotalConverted },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get_orders_analytics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetOrderDetails(payload: any, apiKey: string, supabase: any) {
  const { orderId } = payload;
  if (!orderId) {
    return new Response(JSON.stringify({ error: 'Order ID is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, courses(title, thumbnail_url, price), discount_coupons(code, discount_type, discount_value)')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get buyer profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone, avatar_url')
    .eq('user_id', order.user_id)
    .single();

  // Try to get Pagar.me charge details if available
  let chargeDetails = null;
  if (order.pagarme_charge_id) {
    try {
      const authString = btoa(`${apiKey}:`);
      const res = await fetch(`${PAGARME_API_URL}/charges/${order.pagarme_charge_id}`, {
        headers: { 'Authorization': `Basic ${authString}` },
      });
      if (res.ok) {
        const data = await res.json();
        chargeDetails = {
          gateway_id: data.id,
          gateway_status: data.status,
          last_transaction: data.last_transaction ? {
            id: data.last_transaction.id,
            status: data.last_transaction.status,
            acquirer_name: data.last_transaction.acquirer_name,
            acquirer_tid: data.last_transaction.acquirer_tid,
            acquirer_nsu: data.last_transaction.acquirer_nsu,
            acquirer_auth_code: data.last_transaction.acquirer_auth_code,
            brand: data.last_transaction.card?.brand,
            last_four_digits: data.last_transaction.card?.last_four_digits,
            installments: data.last_transaction.installments,
          } : null,
          created_at: data.created_at,
          paid_at: data.paid_at,
        };
      }
    } catch (err) {
      console.error('Error fetching Pagar.me charge details:', err);
    }
  }

  return new Response(JSON.stringify({
    order: {
      id: order.id,
      amount: order.amount,
      status: order.status,
      payment_method: order.payment_method,
      installments: order.installments,
      paid_at: order.paid_at,
      created_at: order.created_at,
      failure_reason: order.failure_reason,
      discount_amount: order.discount_amount,
      pix_qr_code: order.pix_qr_code,
      boleto_url: order.boleto_url,
      boleto_barcode: order.boleto_barcode,
    },
    course: order.courses ? {
      title: order.courses.title,
      thumbnail_url: order.courses.thumbnail_url,
      original_price: order.courses.price,
    } : null,
    coupon: order.discount_coupons ? {
      code: order.discount_coupons.code,
      discount_type: order.discount_coupons.discount_type,
      discount_value: order.discount_coupons.discount_value,
    } : null,
    buyer: profile ? {
      name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
    } : null,
    gateway: chargeDetails,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
