import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Send, Plus, Trash2, GripVertical, Image, Type, AlignLeft, Minus } from 'lucide-react';
import { toast } from 'sonner';

type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer';

interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  // heading
  level?: 'h1' | 'h2' | 'h3';
  // text
  align?: 'left' | 'center' | 'right';
  // button
  buttonUrl?: string;
  buttonColor?: string;
  // image
  imageUrl?: string;
  imageAlt?: string;
  // spacer
  height?: number;
}

type Campaign = {
  id: string;
  name: string;
  subject: string;
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

// Brand constants matching send-email edge function
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
      return { id: generateId(), type, content: '', imageUrl: '', imageAlt: 'Imagem' };
    case 'divider':
      return { id: generateId(), type, content: '' };
    case 'spacer':
      return { id: generateId(), type, content: '', height: 24 };
  }
}

function blocksToHtml(blocks: EmailBlock[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading': {
        const sizes: Record<string, string> = { h1: '24px', h2: '20px', h3: '17px' };
        const size = sizes[b.level || 'h1'] || '24px';
        return `<${b.level || 'h1'} style="margin: 0 0 16px; font-size: ${size}; font-weight: 500; color: ${brand.text}; font-family: ${fontFamily}; letter-spacing: -0.03em;">${escapeHtml(b.content)}</${b.level || 'h1'}>`;
      }
      case 'text':
        return `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: ${brand.textMuted}; font-family: ${fontFamily}; text-align: ${b.align || 'left'};">${escapeHtml(b.content).replace(/\n/g, '<br>')}</p>`;
      case 'button':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;"><tr><td align="center"><a href="${escapeHtml(b.buttonUrl || '#')}" style="display: inline-block; background: ${b.buttonColor || brand.primary}; color: ${brand.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500; font-size: 15px; font-family: ${fontFamily}; letter-spacing: -0.01em;">${escapeHtml(b.content)}</a></td></tr></table>`;
      case 'image':
        return b.imageUrl ? `<div style="margin: 16px 0; text-align: center;"><img src="${escapeHtml(b.imageUrl)}" alt="${escapeHtml(b.imageAlt || '')}" style="max-width: 100%; border-radius: 8px;" /></div>` : '';
      case 'divider':
        return `<hr style="border: none; border-top: 1px solid ${brand.border}; margin: 24px 0;" />`;
      case 'spacer':
        return `<div style="height: ${b.height || 24}px;"></div>`;
      default:
        return '';
    }
  }).join('\n');
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPreviewHtml(blocks: EmailBlock[], subject: string): string {
  const content = blocksToHtml(blocks);
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap" rel="stylesheet"></head>
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

// Parse stored HTML back into blocks (best-effort, for editing existing campaigns)
function htmlToBlocks(html: string): EmailBlock[] | null {
  // Only attempt parsing campaign content between the template wrapper
  // If it doesn't look like our format, return null to indicate "use raw mode"
  if (!html || !html.includes('Kanaflix Play')) return null;

  // Extract content area between the body markers
  const contentMatch = html.match(/font-family:[^"]*;">\s*([\s\S]*?)\s*<\/td>\s*<\/tr>\s*<!-- Footer|<\/tr>\s*<tr>\s*<td style="padding:24px/i);
  if (!contentMatch) return null;

  // For existing campaigns, we can't reliably parse back to blocks
  // Return null so we handle it gracefully
  return null;
}

export default function CampaignEditor() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const isNew = campaignId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [targetType, setTargetType] = useState('leads');
  const [targetStatus, setTargetStatus] = useState('all');
  const [targetTag, setTargetTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Block editor
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    defaultBlock('heading'),
    defaultBlock('text'),
    defaultBlock('button'),
  ]);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(0);

  const fetchCampaign = useCallback(async () => {
    if (isNew || !campaignId) return;
    setLoading(true);
    const { data } = await supabase.from('email_campaigns').select('*').eq('id', campaignId).single();
    if (data) {
      const c = data as unknown as Campaign;
      setCampaign(c);
      setName(c.name);
      setSubject(c.subject);
      setTargetType(c.target_type);
      setTargetStatus(c.target_filters?.status || 'all');
      setTargetTag(c.target_filters?.tag || '');

      // Try to parse blocks from stored HTML
      const parsed = htmlToBlocks(c.html_content);
      if (parsed) {
        setBlocks(parsed);
      } else {
        // Legacy campaign with raw HTML — create a single text block with notice
        setBlocks([
          { id: generateId(), type: 'heading', content: 'Campanha importada', level: 'h1' },
          { id: generateId(), type: 'text', content: 'Esta campanha foi criada com HTML manual. Edite os blocos abaixo para recriá-la visualmente.', align: 'left' },
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

  const handleSave = async () => {
    if (!name || !subject) {
      toast.error('Preencha nome e assunto');
      return;
    }
    setSaving(true);
    const filters: Record<string, string> = {};
    if (targetStatus !== 'all') filters.status = targetStatus;
    if (targetTag) filters.tag = targetTag;

    const payload = {
      name,
      subject,
      html_content: finalHtml,
      target_type: targetType,
      target_filters: filters,
    };

    if (isNew) {
      const { error } = await supabase.from('email_campaigns').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Campanha criada como rascunho');
      navigate('/admin/marketing/email');
    } else {
      const { error } = await supabase.from('email_campaigns').update(payload).eq('id', campaignId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Campanha salva!');
      fetchCampaign();
    }
    setSaving(false);
  };

  const handleSend = async () => {
    if (!campaign || campaign.status !== 'draft') return;
    setSending(true);

    try {
      let recipients: { email: string; name?: string }[] = [];

      if (campaign.target_type === 'leads') {
        let query = supabase.from('leads').select('email, name');
        if (campaign.target_filters?.status) query = query.eq('status', campaign.target_filters.status);
        if (campaign.target_filters?.tag) query = query.contains('tags', [campaign.target_filters.tag]);
        const { data } = await query;
        recipients = (data || []) as { email: string; name?: string }[];
      } else if (campaign.target_type === 'students') {
        const { data } = await supabase.from('profiles').select('email, full_name');
        recipients = (data || []).filter(p => p.email).map(p => ({ email: p.email!, name: p.full_name || undefined }));
      }

      if (recipients.length === 0) {
        toast.error('Nenhum destinatário encontrado com os filtros selecionados');
        setSending(false);
        return;
      }

      await supabase.from('email_campaigns').update({ status: 'sending', total_recipients: recipients.length }).eq('id', campaign.id);

      let sentCount = 0;
      let failedCount = 0;
      const batchSize = 5;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(r =>
            supabase.functions.invoke('send-email', {
              body: {
                action: 'campaign',
                to: r.email,
                data: { subject: campaign.subject, htmlContent: campaign.html_content, recipientName: r.name || '' },
              },
            })
          )
        );
        results.forEach(r => r.status === 'fulfilled' ? sentCount++ : failedCount++);
      }

      await supabase.from('email_campaigns').update({
        status: failedCount === recipients.length ? 'failed' : 'sent',
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      }).eq('id', campaign.id);

      toast.success(`Campanha enviada: ${sentCount} emails enviados, ${failedCount} falhas`);
      navigate('/admin/marketing/email');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar campanha');
      await supabase.from('email_campaigns').update({ status: 'failed' }).eq('id', campaign!.id);
    } finally {
      setSending(false);
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock = defaultBlock(type);
    const insertAt = selectedBlockIndex !== null ? selectedBlockIndex + 1 : blocks.length;
    const newBlocks = [...blocks];
    newBlocks.splice(insertAt, 0, newBlock);
    setBlocks(newBlocks);
    setSelectedBlockIndex(insertAt);
  };

  const updateBlock = (index: number, updates: Partial<EmailBlock>) => {
    setBlocks(blocks.map((b, i) => i === index ? { ...b, ...updates } : b));
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
    setSelectedBlockIndex(null);
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
    setSelectedBlockIndex(newIndex);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null;
  const isDraft = isNew || campaign?.status === 'draft';

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
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          {!isNew && isDraft && (
            <Button onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4 mr-1" /> {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          )}
        </div>
      </div>

      {/* Config row */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Nome da Campanha</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Black Friday" className="h-9" disabled={!isDraft} />
            </div>
            <div>
              <Label className="text-xs">Assunto do Email</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: 🔥 Oferta especial" className="h-9" disabled={!isDraft} />
            </div>
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
                <Label className="text-xs">Filtro Status</Label>
                <Select value={targetStatus} onValueChange={setTargetStatus} disabled={!isDraft}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="new">Novos</SelectItem>
                    <SelectItem value="contacted">Contatados</SelectItem>
                    <SelectItem value="qualified">Qualificados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {targetType === 'leads' && availableTags.length > 0 && (
            <div className="mt-3 max-w-xs">
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

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: '600px' }}>
        {/* Left: Block editor */}
        <div className="space-y-3">
          {/* Add block toolbar */}
          {isDraft && (
            <Card>
              <CardContent className="p-3">
                <Label className="text-xs text-muted-foreground mb-2 block">Adicionar bloco</Label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { type: 'heading' as BlockType, icon: Type, label: 'Título' },
                    { type: 'text' as BlockType, icon: AlignLeft, label: 'Texto' },
                    { type: 'button' as BlockType, icon: Send, label: 'Botão' },
                    { type: 'image' as BlockType, icon: Image, label: 'Imagem' },
                    { type: 'divider' as BlockType, icon: Minus, label: 'Divisor' },
                  ]).map(item => (
                    <Button key={item.type} variant="outline" size="sm" className="text-xs h-7" onClick={() => addBlock(item.type)}>
                      <item.icon className="h-3 w-3 mr-1" /> {item.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Block list */}
          <div className="space-y-2">
            {blocks.map((block, i) => (
              <Card
                key={block.id}
                className={`cursor-pointer transition-all ${selectedBlockIndex === i ? 'ring-2 ring-primary' : 'hover:border-primary/20'}`}
                onClick={() => setSelectedBlockIndex(i)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={(e) => { e.stopPropagation(); moveBlock(i, -1); }} disabled={i === 0 || !isDraft}>
                        <GripVertical className="h-3 w-3 rotate-180" />
                      </button>
                      <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={(e) => { e.stopPropagation(); moveBlock(i, 1); }} disabled={i === blocks.length - 1 || !isDraft}>
                        <GripVertical className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          {block.type === 'heading' ? 'Título' : block.type === 'text' ? 'Texto' : block.type === 'button' ? 'Botão' : block.type === 'image' ? 'Imagem' : block.type === 'divider' ? 'Divisor' : 'Espaço'}
                        </span>
                      </div>
                      <p className="text-sm text-foreground truncate">
                        {block.type === 'divider' ? '—————' : block.type === 'spacer' ? `${block.height}px` : block.content || '(vazio)'}
                      </p>
                    </div>
                    {isDraft && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={(e) => { e.stopPropagation(); removeBlock(i); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected block editor */}
          {selectedBlock && isDraft && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Editar {selectedBlock.type === 'heading' ? 'Título' : selectedBlock.type === 'text' ? 'Texto' : selectedBlock.type === 'button' ? 'Botão' : selectedBlock.type === 'image' ? 'Imagem' : selectedBlock.type === 'divider' ? 'Divisor' : 'Espaço'}
                </Label>

                {(selectedBlock.type === 'heading' || selectedBlock.type === 'text' || selectedBlock.type === 'button') && (
                  <div>
                    <Label className="text-xs">Conteúdo</Label>
                    {selectedBlock.type === 'text' ? (
                      <Textarea
                        value={selectedBlock.content}
                        onChange={e => updateBlock(selectedBlockIndex!, { content: e.target.value })}
                        rows={4}
                        className="text-sm"
                        placeholder="Texto do email... Use {{name}} para o nome"
                      />
                    ) : (
                      <Input
                        value={selectedBlock.content}
                        onChange={e => updateBlock(selectedBlockIndex!, { content: e.target.value })}
                        className="h-9"
                      />
                    )}
                  </div>
                )}

                {selectedBlock.type === 'heading' && (
                  <div>
                    <Label className="text-xs">Nível</Label>
                    <Select value={selectedBlock.level || 'h1'} onValueChange={v => updateBlock(selectedBlockIndex!, { level: v as 'h1' | 'h2' | 'h3' })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h1">Grande (H1)</SelectItem>
                        <SelectItem value="h2">Médio (H2)</SelectItem>
                        <SelectItem value="h3">Pequeno (H3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedBlock.type === 'text' && (
                  <div>
                    <Label className="text-xs">Alinhamento</Label>
                    <Select value={selectedBlock.align || 'left'} onValueChange={v => updateBlock(selectedBlockIndex!, { align: v as 'left' | 'center' | 'right' })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedBlock.type === 'button' && (
                  <>
                    <div>
                      <Label className="text-xs">URL do link</Label>
                      <Input
                        value={selectedBlock.buttonUrl || ''}
                        onChange={e => updateBlock(selectedBlockIndex!, { buttonUrl: e.target.value })}
                        placeholder="https://..."
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cor do botão</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBlock.buttonColor || brand.primary}
                          onChange={e => updateBlock(selectedBlockIndex!, { buttonColor: e.target.value })}
                          className="h-9 w-12 rounded border cursor-pointer"
                        />
                        <Input
                          value={selectedBlock.buttonColor || brand.primary}
                          onChange={e => updateBlock(selectedBlockIndex!, { buttonColor: e.target.value })}
                          className="h-9 flex-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedBlock.type === 'image' && (
                  <>
                    <div>
                      <Label className="text-xs">URL da imagem</Label>
                      <Input
                        value={selectedBlock.imageUrl || ''}
                        onChange={e => updateBlock(selectedBlockIndex!, { imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Texto alternativo</Label>
                      <Input
                        value={selectedBlock.imageAlt || ''}
                        onChange={e => updateBlock(selectedBlockIndex!, { imageAlt: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </>
                )}

                {selectedBlock.type === 'spacer' && (
                  <div>
                    <Label className="text-xs">Altura (px)</Label>
                    <Input
                      type="number"
                      value={selectedBlock.height || 24}
                      onChange={e => updateBlock(selectedBlockIndex!, { height: parseInt(e.target.value) || 24 })}
                      className="h-9"
                      min={8}
                      max={120}
                    />
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{'{{name}}'}</code> para inserir o nome do destinatário
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Live preview */}
        <div className="sticky top-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Preview do Email</span>
                <span className="text-[10px] text-muted-foreground">{subject || 'Sem assunto'}</span>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full bg-white"
                style={{ height: '560px' }}
                title="Email preview"
                sandbox=""
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
