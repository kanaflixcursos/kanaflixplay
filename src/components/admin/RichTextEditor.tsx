import { useRef, useCallback } from 'react';
import { Bold } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBold = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;

    const selected = value.slice(start, end);
    // Toggle: if already wrapped in <b>, remove it
    const boldMatch = selected.match(/^<b>([\s\S]*)<\/b>$/);
    const replacement = boldMatch ? boldMatch[1] : `<b>${selected}</b>`;

    const next = value.slice(0, start) + replacement + value.slice(end);
    onChange(next);

    // Restore selection after React re-render
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start;
      ta.selectionEnd = start + replacement.length;
    });
  }, [value, onChange]);

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      {!disabled && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Negrito"
            onMouseDown={e => { e.preventDefault(); handleBold(); }}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="border-0 rounded-none focus-visible:ring-0 min-h-[80px] resize-y text-sm"
      />
    </div>
  );
}
