export type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select';
  required: boolean;
  options?: string[];
};

export type LeadForm = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  fields: FormField[];
  redirect_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'archived';

export type Lead = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  source: string;
  status: LeadStatus;
  tags: string[];
  created_at: string;
  form_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  custom_data: Record<string, unknown> | null;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  course_ids: string[];
  payment_methods: string[];
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  course_titles: string[];
};

export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'failed';
export type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer';

export interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  level?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center' | 'right';
  buttonUrl?: string;
  buttonColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  height?: number;
}

export type Campaign = {
  id: string;
  name: string;
  subject: string;
  tag: string | null;
  html_content: string;
  status: CampaignStatus;
  target_type: 'leads' | 'students';
  target_filters: Record<string, string>;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  open_count: number;
  sent_at: string | null;
  created_at: string;
};
