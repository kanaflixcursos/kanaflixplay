import { ReactNode } from 'react';
import Footer from '@/components/Footer';
import AppSidebar from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar variant="admin" />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <SidebarTrigger />
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto bg-background">
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
