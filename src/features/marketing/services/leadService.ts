import { supabase } from '@/lib/supabase';
import { Lead, LeadStatus } from '../types';

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | 'all';
  tag?: string | 'all';
  source?: string | 'all';
}

export interface LeadStats {
  total: number;
  new: number;
  converted: number;
}

const PAGE_SIZE = 50;

export const leadService = {
  async getLeads({ filters, page = 0 }: { filters: LeadFilters, page?: number }): Promise<{ leads: Lead[], count: number }> {
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' });

    if (filters.search) {
      query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.source && filters.source !== 'all') {
      query = query.eq('source', filters.source);
    }
    if (filters.tag && filters.tag !== 'all') {
      query = query.contains('tags', [filters.tag]);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      throw new Error(error.message);
    }

    return { leads: (data as any) || [], count: count || 0 };
  },

  async getLeadStats(): Promise<LeadStats> {
    // This could be optimized with a single RPC call in the future
    const [{ count: total }, { count: newCount }, { count: converted }] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
    ]);
    
    return {
      total: total || 0,
      new: newCount || 0,
      converted: converted || 0,
    };
  },

  async getDistinctTags(): Promise<string[]> {
     const { data, error } = await supabase.rpc('get_distinct_lead_tags');
     if (error) {
      console.error("Error fetching distinct tags:", error);
      // Fallback for when the RPC function doesn't exist yet
      const { data: leads, error: leadError } = await supabase.from('leads').select('tags').limit(1000);
      if(leadError) return [];
      const tags = new Set<string>();
      (leads || []).forEach((l: any) => (l.tags || []).forEach((t: string) => tags.add(t)));
      return Array.from(tags).sort();
     }
     return (data as string[]) || [];
  },

  async getDistinctSources(): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_distinct_lead_sources');
    if (error) {
     console.error("Error fetching distinct sources:", error);
     // Fallback for when the RPC function doesn't exist yet
     const { data: leads, error: leadError } = await supabase.from('leads').select('source').limit(1000);
     if(leadError) return [];
     const sources = new Set<string>();
     (leads || []).forEach((l: any) => l.source && sources.add(l.source));
     return Array.from(sources).sort();
    }
    return (data as string[]) || [];
 },

  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update({
        status,
        ...(status === 'converted' ? { converted_at: new Date().toISOString() } : {}),
      })
      .eq('id', leadId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as any;
  },

  async updateLeadTags(leadId: string, tags: string[]): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update({ tags: [...new Set(tags)] }) // Ensure uniqueness
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as any;
  },

  async deleteLeads(ids: string[]): Promise<void> {
    const { error } = await supabase.from('leads').delete().in('id', ids);
    if (error) throw new Error(error.message);
  },

  async bulkUpdateLeadStatus(ids: string[], status: LeadStatus): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .update({
        status,
        ...(status === 'converted' ? { converted_at: new Date().toISOString() } : {}),
      })
      .in('id', ids);

    if (error) throw new Error(error.message);
  }
};
