import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ParsedUser {
  full_name: string;
  email: string;
  course_ids: string[];
  valid: boolean;
  error?: string;
}

interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export default function ImportUsersDialog({ open, onOpenChange, onImported }: ImportUsersDialogProps) {
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsedUsers([]);
    setStep('upload');
    setImporting(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Skip header if it looks like one
    const startIdx = lines[0]?.toLowerCase().includes('nome') || lines[0]?.toLowerCase().includes('email') ? 1 : 0;
    
    const users: ParsedUser[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = startIdx; i < lines.length; i++) {
      // Support both comma and semicolon as delimiters
      const parts = lines[i].includes(';') 
        ? lines[i].split(';').map(p => p.trim())
        : lines[i].split(',').map(p => p.trim());

      if (parts.length < 2) {
        users.push({ full_name: parts[0] || '', email: '', course_ids: [], valid: false, error: 'Formato inválido' });
        continue;
      }

      const full_name = parts[0];
      const email = parts[1].toLowerCase();
      // Course IDs are in the 3rd column, separated by semicolons or pipes
      const courseIdsRaw = parts[2] || '';
      const course_ids = courseIdsRaw
        .split(/[;|]/)
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (!full_name) {
        users.push({ full_name, email, course_ids, valid: false, error: 'Nome vazio' });
      } else if (!emailRegex.test(email)) {
        users.push({ full_name, email, course_ids, valid: false, error: 'Email inválido' });
      } else {
        users.push({ full_name, email, course_ids, valid: true });
      }
    }

    setParsedUsers(users);
    setStep('preview');
  };

  const handleImport = async () => {
    const validUsers = parsedUsers.filter(u => u.valid);
    if (validUsers.length === 0) {
      toast.error('Nenhum usuário válido para importar');
      return;
    }

    setImporting(true);

    try {
      const rows = validUsers.map(u => ({
        full_name: u.full_name,
        email: u.email.toLowerCase().trim(),
        course_ids: u.course_ids,
        status: 'pending',
      }));

      const { error } = await supabase
        .from('imported_users')
        .upsert(rows, { onConflict: 'email', ignoreDuplicates: false });

      if (error) {
        // Handle unique constraint - try inserting one by one
        let success = 0;
        let duplicates = 0;
        for (const row of rows) {
          const { error: singleError } = await supabase
            .from('imported_users')
            .upsert(row, { onConflict: 'email' });
          
          if (singleError) {
            console.error('Error importing:', row.email, singleError);
            duplicates++;
          } else {
            success++;
          }
        }
        toast.success(`${success} usuários importados. ${duplicates > 0 ? `${duplicates} duplicados ignorados.` : ''}`);
      } else {
        toast.success(`${validUsers.length} usuários importados com sucesso!`);
      }

      onImported();
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar usuários');
    }

    setImporting(false);
  };

  const validCount = parsedUsers.filter(u => u.valid).length;
  const invalidCount = parsedUsers.filter(u => !u.valid).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Usuários (CSV)
          </DialogTitle>
          <DialogDescription>
            Formato: Nome, Email, CursoID1;CursoID2 (separados por ponto e vírgula)
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Selecione um arquivo CSV com os dados dos usuários
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {validCount} válidos
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {invalidCount} inválidos
                </Badge>
              )}
            </div>

            <div className="overflow-auto flex-1 border rounded-md max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cursos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedUsers.map((user, idx) => (
                    <TableRow key={idx} className={!user.valid ? 'opacity-60' : ''}>
                      <TableCell>
                        {user.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-xs text-destructive">{user.error}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.course_ids.length > 0 ? `${user.course_ids.length} curso(s)` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { resetState(); }}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${validCount} usuário(s)`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
