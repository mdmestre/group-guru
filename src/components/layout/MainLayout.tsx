/**
 * MainLayout - Master Layout Component
 * 
 * Integrates:
 * - Sidebar (collapsible)
 * - TopBar (header)
 * - Main content area
 * - Footer
 */

import React from 'react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface MainLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
  showSearch?: boolean;
  showFooter?: boolean;
  className?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  breadcrumbs,
  title,
  showSearch = true,
  showFooter = true,
  className
}) => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
      {/* Sidebar - DKW System (Fixed width: 320px) */}
      <Sidebar />

      {/* Main Content Area - Fixed margin for new sidebar width */}
      <div
        className="transition-all duration-300"
        style={{
          marginLeft: '320px' // Fixed width to match w-80 sidebar
        }}
      >
        {/* TopBar */}
        <TopBar
          breadcrumbs={breadcrumbs}
          title={title}
          showSearch={showSearch}
        />

        {/* Content */}
        <main
          className={cn(
            'pt-20 pb-16 px-4 sm:px-6 md:px-8 min-h-[calc(100vh-80px)]',
            className
          )}
        >
          {children}
        </main>

        {/* Footer */}
        {showFooter && (
          <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4 sm:px-8 bg-white dark:bg-neutral-950">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                © {new Date().getFullYear()} Stracta. Todos os direitos reservados.
              </p>
              <div className="flex gap-6">
                <a
                  href="#"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  Política de Privacidade
                </a>
                <a
                  href="#"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  Termos de Serviço
                </a>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default MainLayout;

