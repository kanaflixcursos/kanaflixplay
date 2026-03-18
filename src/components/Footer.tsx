import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function Footer() {
  const { data: settings } = useSiteSettings();

  return (
    <footer className="border-t py-4 px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground text-center">
        <span>{settings?.footer_text || '© Todos os direitos reservados'}</span>
        <span>{settings?.footer_credits || ''}</span>
      </div>
    </footer>
  );
}
