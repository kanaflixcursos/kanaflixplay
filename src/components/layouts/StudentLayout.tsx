import { ReactNode } from 'react';
import Footer from '@/components/Footer';
import AppSidebar from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface StudentLayoutProps {
  children: ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar variant="student" />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Floating menu button */}
          <div className="fixed top-3 left-3 z-50">
            <SidebarTrigger className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-md hover:bg-card" />
          </div>

          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto bg-muted/30" style={{ '--main-pt': '1rem' } as React.CSSProperties}>
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
