import { supabase } from '@/lib/supabase';
import { Coupon } from '../types';

// This type is for the form payload, which might have differences from the DB model
// e.g., discount_value as a string before conversion.
export type CouponPayload = Omit<Coupon, 'id' | 'created_at' | 'used_count' | 'course_titles'> & {
    // In the form, discount_value can be a string, it's converted to number in the service.
    discount_value: number | string;
};

export const couponService = {
  async getCoupons(): Promise<Coupon[]> {
    const { data, error } = await supabase.rpc('get_coupons_with_course_titles');

    if (error) {
      console.error("Error fetching coupons with RPC:", error);
      throw new Error(error.message);
    }
    
    return data as Coupon[];
  },

  async getCoupon(id: string): Promise<Coupon | null> {
    const { data, error } = await supabase.from('discount_coupons').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
        ...data,
        course_ids: data.course_ids?.length > 0 ? data.course_ids : (data.course_id ? [data.course_id] : []),
        payment_methods: data.payment_methods || [],
    } as Coupon;
  },

  async saveCoupon(coupon: Partial<CouponPayload> & { id?: string }): Promise<Coupon> {
    const { id, ...payload } = coupon;

    const processedPayload = {
      ...payload,
      code: payload.code?.toUpperCase().trim(),
      discount_value: payload.discount_type === 'fixed'
        ? Math.round(Number(payload.discount_value) * 100)
        : Number(payload.discount_value),
      expires_at: payload.expires_at ? new Date(payload.expires_at + 'T23:59:59').toISOString() : null,
      course_id: payload.course_ids?.length === 1 ? payload.course_ids[0] : null, // for legacy support
    };

    let response;
    if (id) {
      response = await supabase.from('discount_coupons').update(processedPayload).eq('id', id).select().single();
    } else {
      response = await supabase.from('discount_coupons').insert(processedPayload).select().single();
    }

    if (response.error) {
        if (response.error.code === '23505') throw new Error('Já existe um cupom com esse código');
        throw response.error;
    }
    return response.data as Coupon;
  },

  async deleteCoupon(id: string): Promise<void> {
    const { error } = await supabase.from('discount_coupons').delete().eq('id', id);
    if (error) throw error;
  }
};
