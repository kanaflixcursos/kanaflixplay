import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Code } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseUrl } from '../utils';

interface CodeGenerationDialogProps {
  formSlug: string;
  formName: string;
}

function generateReactCode(slug: string, baseUrl: string) {
    const fullUrl = `${baseUrl}/functions/v1/lead-capture`;
    return `
// Exemplo de componente React para o formulário
// Adapte o estilo conforme necessário.

import { useState } from 'react';

const API_ENDPOINT = "${fullUrl}?form=${slug}";

export default function LeadForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setStatus('success');
        const data = await res.json();
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        }
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (status === 'success') {
    return <p>Obrigado pelo seu interesse!</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nome" required />
      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Enviando...' : 'Enviar'}
      </button>
      {status === 'error' && <p>Ocorreu um erro. Tente novamente.</p>}
    </form>
  );
}`;
}

export function CodeGenerationDialog({ formSlug, formName }: CodeGenerationDialogProps) {
  const [open, setOpen] = useState(false);
  const supabaseUrl = getSupabaseUrl();
  const apiEndpoint = `${supabaseUrl}/functions/v1/lead-capture?form=${formSlug}`;
  const reactCode = generateReactCode(formSlug, supabaseUrl);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(apiEndpoint); toast.success('Endpoint copiado!'); }}>
                <Copy className="h-3.5 w-3.5 mr-1" /> API
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                <Code className="h-3.5 w-3.5 mr-1" /> Código
            </Button>
        </div>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Código de Integração — {formName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">API Endpoint (POST)</Label>
            <code className="text-xs bg-muted p-2 rounded block break-all">{apiEndpoint}</code>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Componente React (Exemplo)</Label>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">{reactCode}</pre>
          </div>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(reactCode); toast.success('Código copiado!'); }}>
            <Copy className="h-4 w-4 mr-1" /> Copiar Código
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
