import { useLocation } from "react-router-dom";
import {
  Search,
  Bell,
  Settings,
  LogOut,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/design-system";
import { useSidebar } from "@/contexts/SidebarContext";

export function PrivateLayout() {
  const location = useLocation();
  const { user, logout, company, plan } = useAuth();
  const { collapsed: sidebarCollapsed } = useSidebar();

  const handleLogout = () => {
    logout();
    window.location.href = "/auth/login";
  };

  const userName = user?.name || user?.email?.split("@")[0] || "Usuário";
  const userEmail = user?.email || "usuario@email.com";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-neutral-50/50 flex w-full">
        <Sidebar />

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300 ease-in-out min-h-screen",
          sidebarCollapsed ? "ml-20" : "ml-72"
        )}>
          {/* Premium Header */}
          <header className={cn(
            "h-16 border-b border-neutral-200/80",
            "bg-white/80 backdrop-blur-sm",
            "sticky top-0 z-40",
            "flex items-center justify-between px-6",
            "shadow-sm shadow-neutral-900/5"
          )}>
            <div className="flex items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Buscar contatos, mensagens, campanhas..."
                  className={cn(
                    "pl-9 h-10 bg-white border-neutral-200",
                    "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                    "transition-all duration-200",
                    "placeholder:text-neutral-400"
                  )}
                />
              </div>
              
              {plan && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-semibold",
                    "border-primary-300 bg-primary-50 text-primary-700"
                  )}
                >
                  {plan.displayName}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Realtime indicator */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                "bg-green-50 border border-green-200"
              )}>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-700 hidden sm:inline">
                  Conectado
                </span>
              </div>
              
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-9 w-9 relative",
                      "hover:bg-neutral-100"
                    )}
                  >
                    <Bell className="h-5 w-5 text-neutral-600" />
                    <div className={cn(
                      "absolute -right-0.5 -top-0.5",
                      "h-5 w-5 rounded-full bg-red-500",
                      "flex items-center justify-center",
                      "shadow-lg border-2 border-white"
                    )}>
                      <span className="text-[10px] font-bold text-white">5</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="font-semibold">Notificações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <ScrollArea className="h-64">
                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-2 w-2 rounded-full bg-primary-500" />
                        <span className="font-medium text-sm">Nova mensagem</span>
                      </div>
                      <span className="text-xs text-neutral-500">
                        Maria Silva enviou uma mensagem há 5 minutos
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="font-medium text-sm">Automação concluída</span>
                      </div>
                      <span className="text-xs text-neutral-500">
                        Campanha Black Friday finalizada com sucesso
                      </span>
                    </DropdownMenuItem>
                  </ScrollArea>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-center justify-center text-primary-600 font-medium">
                    Ver todas as notificações
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className={cn(
                    "h-9 w-9 cursor-pointer",
                    "ring-2 ring-neutral-200 hover:ring-primary-300",
                    "transition-all duration-200"
                  )}>
                    <AvatarFallback className={cn(
                      "bg-gradient-to-br from-primary-500 to-primary-600",
                      "text-white font-semibold"
                    )}>
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-semibold">
                    <div className="flex flex-col gap-1">
                      <span>{userName}</span>
                      <span className="text-xs font-normal text-neutral-500">{userEmail}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
