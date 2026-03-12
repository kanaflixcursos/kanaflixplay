import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Send, Trash2, ChevronUp, ChevronDown, Type, AlignLeft, Image, Minus, MousePointerClick, Copy, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { leadStatusMap } from '@/lib/lead-constants';
import RichTextEditor from '@/components/admin/RichTextEditor';

// ── Block types & helpers ──────────────────────────────────────────────

type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer';

interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  level?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center' | 'right';
  buttonUrl?: string;
  buttonColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  height?: number;
}

type Campaign = {
  id: string;
  name: string;
  subject: string;
  tag: string | null;
  html_content: string;
  status: string;
  target_type: string;
  target_filters: Record<string, string>;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
};

const brand = {
  primary: '#e67635',
  text: '#171717',
  textMuted: '#737373',
  bg: '#ffffff',
  white: '#ffffff',
  border: '#e5e5e5',
};

const PRODUCTION_URL = 'https://cursos.kanaflix.com.br';
const LOGO_URL = `${PRODUCTION_URL}/logo-kanaflix.png`;
const fontFamily = "'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultBlock(type: BlockType): EmailBlock {
  switch (type) {
    case 'heading':
      return { id: generateId(), type, content: 'Título do email', level: 'h1' };
    case 'text':
      return { id: generateId(), type, content: 'Escreva seu texto aqui. Use {{name}} para o nome do destinatário.', align: 'left' };
    case 'button':
      return { id: generateId(), type, content: 'Clique aqui', buttonUrl: 'https://', buttonColor: brand.primary };
    case 'image':
      return { id: generateId(), type, content: '', imageUrl: '', imageAlt: 'Imagem', imageWidth: 100 };
    case 'divider':
      return { id: generateId(), type, content: '' };
    case 'spacer':
      return { id: generateId(), type, content: '', height: 24 };
  }
}

const BLOCKS_MARKER = '<!-- BLOCKS:';
const BLOCKS_MARKER_END = ' -->';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function blocksToHtml(blocks: EmailBlock[]): string {
  const html = blocks.map(b => {
    switch (b.type) {
      case 'heading': {
        const sizes: Record<string, string> = { h1: '24px', h2: '20px', h3: '17px' };
        const size = sizes[b.level || 'h1'] || '24px';
        return `<${b.level || 'h1'} style="margin: 0 0 16px; font-size: ${size}; font-weight: 500; color: ${brand.text}; font-family: ${fontFamily}; letter-spacing: -0.03em;">${escapeHtml(b.content)}</${b.level || 'h1'}>`;
      }
      case 'text':
        return `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: ${brand.textMuted}; font-family: ${fontFamily}; text-align: ${b.align || 'left'};">${b.content || ''}</p>`;
      case 'button':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;"><tr><td align="center"><a href="${escapeHtml(b.buttonUrl || '#')}" style="display: inline-block; background: ${b.buttonColor || brand.primary}; color: ${brand.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500; font-size: 15px; font-family: ${fontFamily}; letter-spacing: -0.01em;">${escapeHtml(b.content)}</a></td></tr></table>`;
      case 'image': {
        const w = b.imageWidth || 100;
        return b.imageUrl ? `<div style="margin: 16px 0; text-align: center;"><img src="${escapeHtml(b.imageUrl)}" alt="${escapeHtml(b.imageAlt || '')}" style="width: ${w}%; max-width: 100%; border-radius: 8px;" /></div>` : '';
      }
      case 'divider':
        return `<hr style="border: none; border-top: 1px solid ${brand.border}; margin: 24px 0;" />`;
      case 'spacer':
        return `<div style="height: ${b.height || 24}px;"></div>`;
      default:
        return '';
    }
  }).join('\n');
  return html + '\n' + BLOCKS_MARKER + JSON.stringify(blocks) + BLOCKS_MARKER_END;
}

function renderPreviewHtml(blocks: EmailBlock[], subject: string): string {
  const content = blocksToHtml(blocks);
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap" rel="stylesheet"><style>a{pointer-events:none!important;cursor:default!important;}</style></head>
<body style="margin:0;padding:0;font-family:${fontFamily};background-color:${brand.bg};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;">${subject}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.bg};padding:48px 20px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:${brand.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,rgba(230,118,53,0.08) 0%,rgba(255,255,255,0.9) 35%,rgba(31,77,71,0.06) 70%,rgba(230,118,53,0.04) 100%);padding:48px 32px;text-align:center;border-bottom:1px solid #f0f0f0;">
<img src="${LOGO_URL}" alt="Kanaflix Play" height="40" style="display:block;margin:0 auto;">
</td></tr>
<tr><td style="padding:32px 28px;font-family:${fontFamily};">
${content}
</td></tr>
<tr><td style="padding:24px 28px;border-top:1px solid ${brand.border};text-align:center;background-color:#fafafa;">
<p style="margin:0;font-size:13px;color:${brand.textMuted};font-family:${fontFamily};">© ${new Date().getFullYear()} Kanaflix Play. Todos os direitos reservados.</p>
<p style="margin:10px 0 0;font-size:13px;font-family:${fontFamily};"><a href="${PRODUCTION_URL}" style="color:${brand.primary};text-decoration:none;font-weight:500;">cursos.kanaflix.com.br</a></p>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

function htmlToBlocks(html: string): EmailBlock[] | null {
  if (!html) return null;
  const markerIndex = html.indexOf(BLOCKS_MARKER);
  if (markerIndex === -1) return null;
  const jsonStart = markerIndex + BLOCKS_MARKER.length;
  const jsonEnd = html.indexOf(BLOCKS_MARKER_END, jsonStart);
  if (jsonEnd === -1) return null;
  try {
    const parsed = JSON.parse(html.slice(jsonStart, jsonEnd));
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* ignore */ }
  return null;
}

// ── Block type metadata ────────────────────────────────────────────────

const blockTypeMeta: Record<BlockType, { icon: typeof Type; label: string }> = {
  heading: { icon: Type, label: 'Título' },
  text: { icon: AlignLeft, label: 'Texto' },
  button: { icon: MousePointerClick, label: 'Botão' },
  image: { icon: Image, label: 'Imagem' },
  divider: { icon: Minus, label: 'Divisor' },
  spacer: { icon: Minus, label: 'Espaço' },
};

// ── Inline block editor component ─────────────────────────────────────

function BlockEditor({ block, onChange, onRemove, onMove, isFirst, isLast, disabled }: {
  block: EmailBlock;
  onChange: (updates: Partial<EmailBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
}) {
  const meta = blockTypeMeta[block.type];

  return (
    <div className="group border rounded-lg bg-card transition-colors hover:border-primary/30">
      {/* Block header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 rounded-t-lg">
        <meta.icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground flex-1">{meta.label}</span>
        {!disabled && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(-1)} disabled={isFirst}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(1)} disabled={isLast}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Block content editing */}
      <div className="p-3 space-y-2">
        {block.type === 'heading' && (
          <>
            <Input
              value={block.content}
              onChange={e => onChange({ content: e.target.value })}
              className="h-8 text-sm font-medium"
              placeholder="Título..."
              disabled={disabled}
            />
            <Select value={block.level || 'h1'} onValueChange={v => onChange({ level: v as 'h1' | 'h2' | 'h3' })} disabled={disabled}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="h1">Grande</SelectItem>
                <SelectItem value="h2">Médio</SelectItem>
                <SelectItem value="h3">Pequeno</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {block.type === 'text' && (
          <>
            <RichTextEditor
              value={block.content}
              onChange={html => onChange({ content: html })}
              placeholder="Texto do email... Use {{name}} para o nome"
              disabled={disabled}
            />
            <Select value={block.align || 'left'} onValueChange={v => onChange({ align: v as 'left' | 'center' | 'right' })} disabled={disabled}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {block.type === 'button' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Texto</Label>
                <Input value={block.content} onChange={e => onChange({ content: e.target.value })} className="h-8 text-sm" disabled={disabled} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">URL</Label>
                <Input value={block.buttonUrl || ''} onChange={e => onChange({ buttonUrl: e.target.value })} className="h-8 text-sm" placeholder="https://..." disabled={disabled} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Cor</Label>
              <input
                type="color"
                value={block.buttonColor || brand.primary}
                onChange={e => onChange({ buttonColor: e.target.value })}
                className="h-7 w-10 rounded border cursor-pointer"
                disabled={disabled}
              />
              <Input
                value={block.buttonColor || brand.primary}
                onChange={e => onChange({ buttonColor: e.target.value })}
                className="h-8 w-28 font-mono text-xs"
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {block.type === 'image' && (
          <ImageBlockEditor block={block} onChange={onChange} disabled={disabled} />
        )}

        {block.type === 'divider' && (
          <div className="flex items-center justify-center py-1">
            <div className="w-full border-t border-border" />
          </div>
        )}

        {block.type === 'spacer' && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Altura</Label>
            <Input
              type="number"
              value={block.height || 24}
              onChange={e => onChange({ height: parseInt(e.target.value) || 24 })}
              className="h-8 w-20 text-sm"
              min={8}
              max={120}
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function CampaignEditor() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const isNew = campaignId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [campaignTag, setCampaignTag] = useState('');
  const [tagManuallyEdited, setTagManuallyEdited] = useState(false);
  const [targetType, setTargetType] = useState('leads');
  const [targetStatus, setTargetStatus] = useState('all');
  const [targetTag, setTargetTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [blocks, setBlocks] = useState<EmailBlock[]>([
    defaultBlock('heading'),
    defaultBlock('text'),
    defaultBlock('button'),
  ]);

  const fetchCampaign = useCallback(async () => {
    if (isNew || !campaignId) return;
    setLoading(true);
    const { data } = await supabase.from('email_campaigns').select('*').eq('id', campaignId).single();
    if (data) {
      const c = data as unknown as Campaign;
      setCampaign(c);
      setName(c.name);
      setSubject(c.subject);
      setCampaignTag(c.tag || '');
      setTagManuallyEdited(true);
      setTargetType(c.target_type);
      setTargetStatus(c.target_filters?.status || 'all');
      setTargetTag(c.target_filters?.tag || '');
      const parsed = htmlToBlocks(c.html_content);
      if (parsed) {
        setBlocks(parsed);
      } else {
        setBlocks([
          { id: generateId(), type: 'heading', content: 'Campanha importada', level: 'h1' },
          { id: generateId(), type: 'text', content: 'Esta campanha foi criada com HTML manual. Edite os blocos abaixo.', align: 'left' },
        ]);
      }
    }
    setLoading(false);
  }, [campaignId, isNew]);

  const fetchTags = useCallback(async () => {
    const { data: leads } = await supabase.from('leads').select('tags').limit(500);
    const tags = new Set<string>();
    (leads || []).forEach((l: any) => (l.tags || []).forEach((t: string) => tags.add(t)));
    setAvailableTags(Array.from(tags).sort());
  }, []);

  useEffect(() => { fetchCampaign(); fetchTags(); }, [fetchCampaign, fetchTags]);

  const previewHtml = useMemo(() => renderPreviewHtml(blocks, subject), [blocks, subject]);
  const finalHtml = useMemo(() => blocksToHtml(blocks), [blocks]);

  const buildPayload = () => {
    const filters: Record<string, string> = {};
    if (targetStatus !== 'all') filters.status = targetStatus;
    if (targetTag) filters.tag = targetTag;
    return { name, subject, tag: campaignTag || null, html_content: finalHtml, target_type: targetType, target_filters: filters };
  };

  const validateRequired = (): boolean => {
    if (!name.trim()) { toast.error('Preencha o nome da campanha'); return false; }
    if (!subject.trim()) { toast.error('Preencha o assunto do email'); return false; }
    const headingBlock = blocks.find(b => b.type === 'heading');
    if (!headingBlock || !headingBlock.content.trim()) { toast.error('Preencha o título do email'); return false; }
    const textBlock = blocks.find(b => b.type === 'text');
    if (!textBlock || !textBlock.content.trim()) { toast.error('Preencha o texto do email'); return false; }
    const buttonBlock = blocks.find(b => b.type === 'button');
    if (buttonBlock && (!buttonBlock.buttonUrl || buttonBlock.buttonUrl === 'https://' || !buttonBlock.buttonUrl.trim())) {
      toast.error('Preencha a URL do botão'); return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateRequired()) return;
    setSaving(true);
    const payload = buildPayload();

    if (isNew) {
      const { error } = await supabase.from('email_campaigns').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Rascunho salvo');
      navigate('/admin/marketing/email');
    } else {
      const { error } = await supabase.from('email_campaigns').update(payload).eq('id', campaignId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Rascunho atualizado');
      fetchCampaign();
    }
    setSaving(false);
  };

  const handleSaveAndSend = async () => {
    if (!validateRequired()) return;
    setSaving(true);
    const payload = buildPayload();

    // Save first
    let savedId = campaignId;
    if (isNew) {
      const { data: inserted, error } = await supabase.from('email_campaigns').insert(payload).select('id').single();
      if (error || !inserted) { toast.error(error?.message || 'Erro ao salvar'); setSaving(false); return; }
      savedId = inserted.id;
    } else {
      const { error } = await supabase.from('email_campaigns').update(payload).eq('id', campaignId);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    setSaving(false);

    // Fetch the saved campaign to send
    const { data: freshCampaign } = await supabase.from('email_campaigns').select('*').eq('id', savedId).single();
    if (!freshCampaign) { toast.error('Campanha não encontrada'); return; }
    const c = freshCampaign as unknown as Campaign;
    if (c.status !== 'draft') { toast.error('Campanha já foi enviada'); return; }
    setCampaign(c);

    // Now send
    setSending(true);
    try {
      let recipients: { email: string; name?: string }[] = [];
      if (c.target_type === 'leads') {
        let query = supabase.from('leads').select('email, name');
        if (c.target_filters?.status) query = query.eq('status', c.target_filters.status);
        if (c.target_filters?.tag) query = query.contains('tags', [c.target_filters.tag]);
        const { data } = await query;
        recipients = (data || []) as { email: string; name?: string }[];
      } else if (c.target_type === 'students') {
        const { data } = await supabase.from('profiles').select('email, full_name');
        recipients = (data || []).filter(p => p.email).map(p => ({ email: p.email!, name: p.full_name || undefined }));
      }
      if (recipients.length === 0) { toast.error('Nenhum destinatário encontrado'); setSending(false); return; }

      await supabase.from('email_campaigns').update({ status: 'sending', total_recipients: recipients.length }).eq('id', c.id);
      let sentCount = 0;
      let failedCount = 0;
      const batchSize = 5;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(r =>
            supabase.functions.invoke('send-email', {
              body: { action: 'campaign', to: r.email, data: { subject: c.subject, htmlContent: c.html_content, recipientName: r.name || '', campaignId: c.id, campaignTag: c.tag || '' } },
            })
          )
        );
        results.forEach(r => r.status === 'fulfilled' ? sentCount++ : failedCount++);
      }

      await supabase.from('email_campaigns').update({
        status: failedCount === recipients.length ? 'failed' : 'sent',
        sent_count: sentCount, failed_count: failedCount, sent_at: new Date().toISOString(),
      }).eq('id', c.id);
      toast.success(`Campanha enviada: ${sentCount} emails, ${failedCount} falhas`);
      navigate('/admin/marketing/email');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar campanha');
      await supabase.from('email_campaigns').update({ status: 'failed' }).eq('id', c.id);
    } finally {
      setSending(false);
    }
  };

  const handleDuplicate = async () => {
    const payload = buildPayload();
    payload.name = `${payload.name} (cópia)`;
    const { error } = await supabase.from('email_campaigns').insert({ ...payload, status: 'draft' } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Campanha duplicada como rascunho');
    navigate('/admin/marketing/email');
  };


  const addBlock = (type: BlockType) => {
    setBlocks(prev => [...prev, defaultBlock(type)]);
  };

  const updateBlock = (index: number, updates: Partial<EmailBlock>) => {
    setBlocks(blocks.map((b, i) => i === index ? { ...b, ...updates } : b));
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const isDraft = isNew || campaign?.status === 'draft';
  const addableBlocks: { type: BlockType; label: string }[] = [
    { type: 'heading', label: 'Título' },
    { type: 'text', label: 'Texto' },
    { type: 'button', label: 'Botão' },
    { type: 'image', label: 'Imagem' },
    { type: 'divider', label: 'Divisor' },
    { type: 'spacer', label: 'Espaço' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing/email')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {isNew ? 'Nova Campanha' : name || 'Editar Campanha'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving || sending}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
          )}
          {isDraft && (
            <Button onClick={handleSaveAndSend} disabled={saving || sending}>
              <Send className="h-4 w-4 mr-1" /> {sending ? 'Enviando...' : 'Salvar e Enviar'}
            </Button>
          )}
          <Button variant="outline" onClick={handleDuplicate} disabled={saving || sending}>
            <Copy className="h-4 w-4 mr-1" /> Duplicar
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: '600px' }}>
        {/* Left column: config + blocks */}
        <div className="space-y-4">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            {/* ── Content tab ── */}
            <TabsContent value="content" className="space-y-3 mt-3">
              {/* Subject inline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome da Campanha</Label>
                  <Input value={name} onChange={e => {
                    const v = e.target.value;
                    setName(v);
                    if (!tagManuallyEdited) setCampaignTag(slugify(v));
                  }} placeholder="Ex: Black Friday" className="h-9" disabled={!isDraft} />
                </div>
                <div>
                  <Label className="text-xs">Assunto do Email</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: 🔥 Oferta especial" className="h-9" disabled={!isDraft} />
                </div>
              </div>

              {/* Blocks */}
              <div className="space-y-2">
                {blocks.map((block, i) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    onChange={updates => updateBlock(i, updates)}
                    onRemove={() => removeBlock(i)}
                    onMove={dir => moveBlock(i, dir)}
                    isFirst={i === 0}
                    isLast={i === blocks.length - 1}
                    disabled={!isDraft}
                  />
                ))}
              </div>

              {/* Add block bar */}
              {isDraft && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {addableBlocks.map(item => {
                    const meta = blockTypeMeta[item.type];
                    return (
                      <Button key={item.type} variant="outline" size="sm" className="text-xs h-7" onClick={() => addBlock(item.type)}>
                        <meta.icon className="h-3 w-3 mr-1" /> {item.label}
                      </Button>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{'{{name}}'}</code> para inserir o nome do destinatário
              </p>
            </TabsContent>

            {/* ── Settings tab ── */}
            <TabsContent value="settings" className="mt-3">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-xs">Tag de Rastreamento</Label>
                    <Input value={campaignTag} onChange={e => { setCampaignTag(e.target.value); setTagManuallyEdited(true); }} placeholder="ex: black-friday-2026" className="h-9 font-mono text-xs" disabled={!isDraft} />
                    <p className="text-xs text-muted-foreground mt-0.5">Usada como utm_campaign nos links do email</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Público-alvo</Label>
                      <Select value={targetType} onValueChange={setTargetType} disabled={!isDraft}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leads">Leads</SelectItem>
                          <SelectItem value="students">Alunos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {targetType === 'leads' && (
                      <div>
                        <Label className="text-xs">Filtro de Status</Label>
                        <Select value={targetStatus} onValueChange={setTargetStatus} disabled={!isDraft}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {Object.entries(leadStatusMap).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {targetType === 'leads' && availableTags.length > 0 && (
                    <div className="max-w-xs">
                      <Label className="text-xs">Filtrar por Tag</Label>
                      <Select value={targetTag} onValueChange={setTargetTag} disabled={!isDraft}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {availableTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: live preview */}
        <div className="sticky top-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Preview</span>
                <span className="text-xs text-muted-foreground truncate ml-2">{subject || 'Sem assunto'}</span>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full bg-white"
                style={{ height: '600px' }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
