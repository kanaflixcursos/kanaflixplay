import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Image, Type, AlignLeft, Minus } from 'lucide-react';
import { EmailBlock, BlockType } from '../types';

interface EmailBlockEditorProps {
  blocks: EmailBlock[];
  setBlocks: (blocks: EmailBlock[]) => void;
  selectedBlockIndex: number | null;
  setSelectedBlockIndex: (index: number | null) => void;
  isEditable: boolean;
}

const brand = { primary: '#e67635' }; // Simplified brand colors

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultBlock(type: BlockType): EmailBlock {
  switch (type) {
    case 'heading': return { id: generateId(), type, content: 'Título do email', level: 'h1' };
    case 'text': return { id: generateId(), type, content: 'Escreva seu texto aqui. Use {{name}} para o nome do destinatário.', align: 'left' };
    case 'button': return { id: generateId(), type, content: 'Clique aqui', buttonUrl: 'https://', buttonColor: brand.primary };
    case 'image': return { id: generateId(), type, content: '', imageUrl: '', imageAlt: 'Imagem' };
    case 'divider': return { id: generateId(), type, content: '' };
    case 'spacer': return { id: generateId(), type, content: '', height: 24 };
  }
}

export function EmailBlockEditor({ blocks, setBlocks, selectedBlockIndex, setSelectedBlockIndex, isEditable }: EmailBlockEditorProps) {
    const addBlock = (type: BlockType) => {
        const newBlock = defaultBlock(type);
        const insertAt = selectedBlockIndex !== null ? selectedBlockIndex + 1 : blocks.length;
        const newBlocks = [...blocks];
        newBlocks.splice(insertAt, 0, newBlock);
        setBlocks(newBlocks);
        setSelectedBlockIndex(insertAt);
    };
    const updateBlock = (index: number, updates: Partial<EmailBlock>) => setBlocks(blocks.map((b, i) => i === index ? { ...b, ...updates } : b));
    const removeBlock = (index: number) => { setBlocks(blocks.filter((_, i) => i !== index)); setSelectedBlockIndex(null); };
    const moveBlock = (index: number, dir: -1 | 1) => {
        const newIndex = index + dir;
        if (newIndex < 0 || newIndex >= blocks.length) return;
        const newBlocks = [...blocks];
        [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
        setBlocks(newBlocks);
        setSelectedBlockIndex(newIndex);
    };

    const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null;

    return (
        <div className="space-y-3">
            {isEditable && (
                <Card><CardContent className="p-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">Adicionar bloco</Label>
                    <div className="flex flex-wrap gap-1.5">
                        {([
                            { type: 'heading', icon: Type, label: 'Título' }, { type: 'text', icon: AlignLeft, label: 'Texto' },
                            { type: 'button', icon: Send, label: 'Botão' }, { type: 'image', icon: Image, label: 'Imagem' },
                            { type: 'divider', icon: Minus, label: 'Divisor' }, { type: 'spacer', icon: Minus, label: 'Espaço' }
                        ] as { type: BlockType, icon: any, label: string }[]).map(item => (
                            <Button key={item.type} variant="outline" size="sm" className="text-xs h-7" onClick={() => addBlock(item.type)}><item.icon className="h-3 w-3 mr-1" />{item.label}</Button>
                        ))}
                    </div>
                </CardContent></Card>
            )}

            <div className="space-y-2">
                {blocks.map((block, i) => (
                    <Card key={block.id} className={`cursor-pointer transition-all ${selectedBlockIndex === i ? 'ring-2 ring-primary' : 'hover:border-primary/20'}`} onClick={() => setSelectedBlockIndex(i)}>
                        <CardContent className="p-3"><div className="flex items-start gap-2">
                            <div className="flex flex-col gap-0.5 pt-1">
                                <button className="text-muted-foreground disabled:opacity-30" onClick={(e) => { e.stopPropagation(); moveBlock(i, -1); }} disabled={i === 0 || !isEditable}><GripVertical className="h-3 w-3 rotate-180" /></button>
                                <button className="text-muted-foreground disabled:opacity-30" onClick={(e) => { e.stopPropagation(); moveBlock(i, 1); }} disabled={i === blocks.length - 1 || !isEditable}><GripVertical className="h-3 w-3" /></button>
                            </div>
                            <div className="flex-1 min-w-0"><p className="text-sm truncate">{block.type === 'divider' ? '—' : block.type === 'spacer' ? `${block.height}px` : block.content || `(${block.type})`}</p></div>
                            {isEditable && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={(e) => { e.stopPropagation(); removeBlock(i); }}><Trash2 className="h-3 w-3" /></Button>}
                        </div></CardContent>
                    </Card>
                ))}
            </div>

            {selectedBlock && isEditable && (
                <Card><CardContent className="p-4 space-y-3">
                    <Label className="text-xs font-medium uppercase">Editar {selectedBlock.type}</Label>
                    {(selectedBlock.type === 'heading' || selectedBlock.type === 'text' || selectedBlock.type === 'button') && <div><Label className="text-xs">Conteúdo</Label>{selectedBlock.type === 'text' ? <Textarea value={selectedBlock.content} onChange={e => updateBlock(selectedBlockIndex!, { content: e.target.value })} rows={4} /> : <Input value={selectedBlock.content} onChange={e => updateBlock(selectedBlockIndex!, { content: e.target.value })} />}</div>}
                    {selectedBlock.type === 'heading' && <div><Label className="text-xs">Nível</Label><Select value={selectedBlock.level || 'h1'} onValueChange={v => updateBlock(selectedBlockIndex!, { level: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="h1">Grande</SelectItem><SelectItem value="h2">Médio</SelectItem><SelectItem value="h3">Pequeno</SelectItem></SelectContent></Select></div>}
                    {selectedBlock.type === 'text' && <div><Label className="text-xs">Alinhamento</Label><Select value={selectedBlock.align || 'left'} onValueChange={v => updateBlock(selectedBlockIndex!, { align: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Esquerda</SelectItem><SelectItem value="center">Centro</SelectItem><SelectItem value="right">Direita</SelectItem></SelectContent></Select></div>}
                    {selectedBlock.type === 'button' && <><div><Label className="text-xs">URL</Label><Input value={selectedBlock.buttonUrl || ''} onChange={e => updateBlock(selectedBlockIndex!, { buttonUrl: e.target.value })} /></div><div><Label className="text-xs">Cor</Label><div className="flex gap-2"><input type="color" value={selectedBlock.buttonColor || brand.primary} onChange={e => updateBlock(selectedBlockIndex!, { buttonColor: e.target.value })} /><Input value={selectedBlock.buttonColor || brand.primary} onChange={e => updateBlock(selectedBlockIndex!, { buttonColor: e.target.value })} /></div></div></>}
                    {selectedBlock.type === 'image' && <><div><Label className="text-xs">URL da Imagem</Label><Input value={selectedBlock.imageUrl || ''} onChange={e => updateBlock(selectedBlockIndex!, { imageUrl: e.target.value })} /></div><div><Label className="text-xs">Texto Alternativo</Label><Input value={selectedBlock.imageAlt || ''} onChange={e => updateBlock(selectedBlockIndex!, { imageAlt: e.target.value })} /></div></>}
                    {selectedBlock.type === 'spacer' && <div><Label className="text-xs">Altura (px)</Label><Input type="number" value={selectedBlock.height || 24} onChange={e => updateBlock(selectedBlockIndex!, { height: parseInt(e.target.value) || 24 })} /></div>}
                </CardContent></Card>
            )}
        </div>
    );
}

