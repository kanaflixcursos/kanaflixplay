import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Upload, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface ParsedRow {
  full_name: string;
  email: string;
  course_ids: string[];
}

interface Course {
  id: string;
  title: string;
}

export default function ImportUsersDialog({ open, onOpenChange, onImported }: ImportUsersDialogProps) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [nameColumn, setNameColumn] = useState('');
  const [emailColumn, setEmailColumn] = useState('');
  const [courseIdsColumn, setCourseIdsColumn] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; skipped: number; errors: string[] }>({ success: 0, skipped: 0, errors: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setNameColumn('');
    setEmailColumn('');
    setCourseIdsColumn('');
    setParsedData([]);
    setImportResults({ success: 0, skipped: 0, errors: [] });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('O arquivo deve conter pelo menos um cabeçalho e uma linha de dados');
      return;
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line =>
      line.split(separator).map(cell => cell.trim().replace(/^"|"$/g, ''))
    );

    setCsvHeaders(headers);
    setCsvRows(rows);

    // Auto-detect columns
    const nameLower = headers.map(h => h.toLowerCase());
    const nameIdx = nameLower.findIndex(h => h.includes('nome') || h.includes('name'));
    const emailIdx = nameLower.findIndex(h => h.includes('email') || h.includes('e-mail'));
    const courseIdx = nameLower.findIndex(h => h.includes('curso') || h.includes('course'));

    if (nameIdx >= 0) setNameColumn(headers[nameIdx]);
    if (emailIdx >= 0) setEmailColumn(headers[emailIdx]);
    if (courseIdx >= 0) setCourseIdsColumn(headers[courseIdx]);

    // Fetch courses for reference
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title');
    setCourses(coursesData || []);

    setStep('map');
  };

  const handleMapColumns = () => {
    if (!nameColumn || !emailColumn) {
      toast.error('Selecione as colunas de nome e email');
      return;
    }

    const nameIdx = csvHeaders.indexOf(nameColumn);
    const emailIdx = csvHeaders.indexOf(emailColumn);
    const courseIdx = courseIdsColumn ? csvHeaders.indexOf(courseIdsColumn) : -1;

    const parsed: ParsedRow[] = csvRows
      .filter(row => row[emailIdx]?.trim())
      .map(row => ({
        full_name: row[nameIdx]?.trim() || '',
        email: row[emailIdx]?.trim().toLowerCase(),
        course_ids: courseIdx >= 0 && row[courseIdx]
          ? row[courseIdx].split(';').map(id => id.trim()).filter(Boolean)
          : [],
      }));

    setParsedData(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    let success = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of parsedData) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('imported_users')
          .select('id')
          .ilike('email', row.email)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const { error } = await supabase
          .from('imported_users')
          .insert({
            full_name: row.full_name,
            email: row.email,
            course_ids: row.course_ids,
            status: 'pending',
          });

        if (error) {
          errors.push(`${row.email}: ${error.message}`);
        } else {
          success++;
        }
      } catch (err: any) {
        errors.push(`${row.email}: ${err.message}`);
      }
    }

    setImportResults({ success, skipped, errors });
    setStep('done');
    if (success > 0) onImported();
  };

  const getCourseTitle = (id: string) => {
    return courses.find(c => c.id === id)?.title || id.slice(0, 8) + '...';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Usuários via CSV
          </DialogTitle>
          <DialogDescription>
            Importe alunos de um arquivo CSV para a lista de usuários migrados.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Clique para selecionar um arquivo CSV</p>
              <p className="text-sm text-muted-foreground mt-1">
                O arquivo deve conter colunas de nome e email
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {csvRows.length} linhas encontradas. Mapeie as colunas do CSV:
            </p>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Coluna de Nome *</Label>
                <Select value={nameColumn} onValueChange={setNameColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Coluna de Email *</Label>
                <Select value={emailColumn} onValueChange={setEmailColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Coluna de IDs de Cursos (opcional)</Label>
                <Select value={courseIdsColumn} onValueChange={setCourseIdsColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {csvHeaders.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  IDs de cursos separados por ponto e vírgula (;) em cada célula
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleMapColumns}>Pré-visualizar</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {parsedData.length} usuários prontos para importação:
            </p>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cursos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.full_name}</TableCell>
                      <TableCell className="text-sm">{row.email}</TableCell>
                      <TableCell>
                        {row.course_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.course_ids.map((id, j) => (
                              <Badge key={j} variant="secondary" className="text-xs">
                                {getCourseTitle(id)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 50 && (
              <p className="text-xs text-muted-foreground">
                Mostrando 50 de {parsedData.length} linhas
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('map')}>Voltar</Button>
              <Button onClick={handleImport}>
                Importar {parsedData.length} usuários
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Importando usuários...</p>
            <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
              <p className="font-medium">Importação concluída!</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                <p className="text-sm text-muted-foreground">Importados</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{importResults.skipped}</p>
                <p className="text-sm text-muted-foreground">Já existentes</p>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="p-3 border border-destructive/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium text-destructive">{importResults.errors.length} erro(s):</p>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {importResults.errors.map((err, i) => (
                    <p key={i} className="text-muted-foreground">{err}</p>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
