import { supabase } from '@/lib/supabase';
import { LeadForm } from '../types';

export const formService = {
  async getForms(): Promise<LeadForm[]> {
    const { data, error } = await supabase
      .from('lead_forms')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching forms:", error);
      throw new Error(error.message);
    }
    
    return (data as any) || [];
  },

  async getForm(id: string): Promise<LeadForm | null> {
    const { data, error } = await supabase
      .from('lead_forms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching form ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data as any;
  },

  async createForm(payload: Omit<LeadForm, 'id' | 'created_at'>): Promise<LeadForm> {
    const { data, error } = await supabase
      .from('lead_forms')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating form:", error);
      throw new Error(error.message);
    }
    
    return data as any;
  },

  async updateForm(id: string, payload: Partial<LeadForm>): Promise<LeadForm> {
    const { data, error } = await supabase
      .from('lead_forms')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating form ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data as any;
  },
  
  async deleteForm(id: string) {
    const { error } = await supabase.from('lead_forms').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting form ${id}:`, error);
      throw new Error(error.message);
    }
    return true;
  }
};
