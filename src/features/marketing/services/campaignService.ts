import { supabase } from '@/lib/supabase';
import { Campaign } from '../types';

export const campaignService = {
  async getCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Campaign[];
  },

  async getCampaign(id: string): Promise<Campaign | null> {
    const { data, error } = await supabase.from('email_campaigns').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Campaign;
  },

  async saveCampaign(campaign: Partial<Campaign> & { id?: string }): Promise<Campaign> {
    const { id, ...payload } = campaign;
    
    const response = id
      ? await supabase.from('email_campaigns').update(payload).eq('id', id).select().single()
      : await supabase.from('email_campaigns').insert(payload).select().single();

    if (response.error) throw response.error;
    return response.data as Campaign;
  },

  async deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
    if (error) throw error;
  },
  
  async sendCampaign(campaignId: string): Promise<{ message: string }> {
    const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: { campaignId },
    });
    if (error) throw error;
    return data;
  }
};
