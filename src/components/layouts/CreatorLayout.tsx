import { ReactNode } from 'react';
import Footer from '@/components/Footer';
import AppSidebar from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface CreatorLayoutProps {
  children: ReactNode;
}

export default function CreatorLayout({ children }: CreatorLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar variant="creator" />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b md:hidden">
            <SidebarTrigger className="ml-2" />
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto bg-muted/30">
            <div className="max-w-[1200px] mx-auto w-full">
              {children}
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
