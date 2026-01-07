import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/routes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "@/design-system/useTheme";

const queryClient = new QueryClient();

/**
 * Main App Component
 * 
 * Provides global providers and routing configuration.
 * All routes are defined in @/routes/index.tsx
 * 
 * Provider hierarchy:
 * - QueryClientProvider (React Query)
 * - ThemeProvider (Light/Dark mode)
 * - TooltipProvider (Radix UI)
 * - AuthProvider (Authentication)
 * - SidebarProvider (Sidebar state)
 * - BrowserRouter (Routing)
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <SidebarProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AppRoutes />
            </BrowserRouter>
          </SidebarProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
