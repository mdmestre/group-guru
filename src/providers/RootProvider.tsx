/**
 * Root Provider - Agrupa todos os providers globais
 * QueryClient, Socket.IO, Temas, etc
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from '@/contexts/SocketProvider';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from 'next-themes';

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <SocketProvider>
          {children}
        </SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
