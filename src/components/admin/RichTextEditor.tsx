import { useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, Link, List, ListOrdered, Strikethrough } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const normalizeContent = useCallback(() => {
    if (!editorRef.current) return;
    // Remove <font> tags browsers inject (preserve children)
    const fonts = editorRef.current.querySelectorAll('font');
    fonts.forEach(font => {
      const frag = document.createDocumentFragment();
      while (font.firstChild) frag.appendChild(font.firstChild);
      font.replaceWith(frag);
    });
    // Remove inline color/font-size styles from spans
    const spans = editorRef.current.querySelectorAll('span[style]');
    spans.forEach(span => {
      (span as HTMLElement).style.removeProperty('color');
      (span as HTMLElement).style.removeProperty('font-size');
      (span as HTMLElement).style.removeProperty('font-family');
      // If span has no remaining styles, unwrap it
      if (!(span as HTMLElement).getAttribute('style')?.trim()) {
        const frag = document.createDocumentFragment();
        while (span.firstChild) frag.appendChild(span.firstChild);
        span.replaceWith(frag);
      }
    });
    // Replace orphan <div> wrappers with line breaks
    const divs = editorRef.current.querySelectorAll('div:not(li > div)');
    divs.forEach(div => {
      if (div.parentElement === editorRef.current) {
        const br = document.createElement('br');
        const frag = document.createDocumentFragment();
        while (div.firstChild) frag.appendChild(div.firstChild);
        frag.appendChild(br);
        div.replaceWith(frag);
      }
    });
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    onChange(editorRef.current.innerHTML);
    requestAnimationFrame(() => { isUpdatingRef.current = false; });
  }, [onChange]);

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    // Normalize after list commands to prevent typography changes
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      requestAnimationFrame(() => {
        normalizeContent();
        handleInput();
      });
    } else {
      handleInput();
    }
  }, [handleInput, normalizeContent]);

  const handleLink = useCallback(() => {
    const url = prompt('URL do link:', 'https://');
    if (url) exec('createLink', url);
  }, [exec]);

  const tools = [
    { icon: Bold, cmd: 'bold', label: 'Negrito' },
    { icon: Italic, cmd: 'italic', label: 'Itálico' },
    { icon: Underline, cmd: 'underline', label: 'Sublinhado' },
    { icon: Strikethrough, cmd: 'strikeThrough', label: 'Tachado' },
    { icon: List, cmd: 'insertUnorderedList', label: 'Lista' },
    { icon: ListOrdered, cmd: 'insertOrderedList', label: 'Lista numerada' },
  ];

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      {!disabled && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30 flex-wrap">
          {tools.map(({ icon: Icon, cmd, label }) => (
            <Button
              key={cmd}
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={label}
              onMouseDown={e => { e.preventDefault(); exec(cmd); }}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Link"
            onMouseDown={e => { e.preventDefault(); handleLink(); }}
          >
            <Link className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        className="px-3 py-2 min-h-[80px] text-sm outline-none focus:ring-0 text-foreground [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_*]:text-inherit"
        data-placeholder={placeholder}
        style={{ whiteSpace: 'pre-wrap' }}
        suppressContentEditableWarning
      />
    </div>
  );
}
