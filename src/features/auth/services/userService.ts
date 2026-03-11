import { supabase } from '@/lib/supabase';
import { getStoredUtm, clearStoredUtm } from '@/lib/utm';
import { UserRole } from '../types';

export const userService = {
  async getUserRole(userId: string): Promise<UserRole | null> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    return data?.role as UserRole | null;
  },

  async isProfileComplete(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('phone, birth_date')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error checking profile completion:', error);
      return false;
    }
    
    return !!(data?.phone && data?.birth_date);
  },

  async updateLastSeen(userId: string): Promise<void> {
    try {
      const utm = getStoredUtm();
      const updateData: Record<string, string> = { last_seen_at: new Date().toISOString() };
      
      // First-touch UTM attribution: only set if profile doesn't have UTM yet
      if (utm.utm_source) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('utm_source')
          .eq('user_id', userId)
          .single();
        
        if (profile && !profile.utm_source) {
          updateData.utm_source = utm.utm_source;
          if (utm.utm_medium) updateData.utm_medium = utm.utm_medium;
          if (utm.utm_campaign) updateData.utm_campaign = utm.utm_campaign;
          clearStoredUtm();
        }
      }
      
      await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }
};
