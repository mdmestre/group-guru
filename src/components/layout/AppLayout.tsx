import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Bot,
  Send,
  LayoutDashboard,
  Settings,
  MessageCircle,
  Megaphone,
  Menu,
  Bell,
  Search,
  Home
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

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Home, label: "Painel", href: "/" },
  { icon: Users, label: "CRM", href: "/crm" },
  { icon: Megaphone, label: "Disparos", href: "/crm?tab=disparos" },
  { icon: Bot, label: "Automações", href: "/crm?tab=automations" },
  { icon: MessageCircle, label: "Conversas", href: "/", badge: "12" },
  { icon: Settings, label: "Configurações", href: "/" },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      return location.pathname === path && location.search.includes(query.split("=")[1]);
    }
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Stracta</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Toggle Button - visible when collapsed */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "h-8 w-8 absolute top-4 transition-all duration-300",
            sidebarCollapsed ? "right-4" : "right-3"
          )}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {sidebarItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", active && "text-primary-foreground")} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="h-5 min-w-[20px] text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {sidebarCollapsed && item.badge && (
                    <div className="absolute -right-1 -top-1 h-4 min-w-[16px] rounded-full bg-destructive flex items-center justify-center">
                      <span className="text-[10px] font-bold text-destructive-foreground px-1">
                        {item.badge}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User */}
        <div className="p-4 border-t border-sidebar-border">
          <div className={cn(
            "flex items-center gap-3",
            sidebarCollapsed && "justify-center"
          )}>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-primary">AD</AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Admin</p>
                <p className="text-xs text-muted-foreground truncate">admin@empresa.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contatos, mensagens..."
                className="pl-9 bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Realtime indicator */}
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-muted-foreground hidden sm:inline">Conectado</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <div className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
                    <span className="text-[10px] font-bold text-destructive-foreground">5</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                  <span className="font-medium">Nova mensagem</span>
                  <span className="text-xs text-muted-foreground">Maria Silva enviou uma mensagem</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                  <span className="font-medium">Automação concluída</span>
                  <span className="text-xs text-muted-foreground">Campanha Black Friday finalizada</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground">AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
