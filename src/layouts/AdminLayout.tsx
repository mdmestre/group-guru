import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Settings,
  Shield,
  BarChart3,
  UserCog,
  Menu,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import api from "@/services/api";

const adminSidebarItems = [
  { icon: BarChart3, label: "Dashboard Admin", href: "/admin/dashboard" },
  { icon: Users, label: "Usuários", href: "/admin/users" },
  { icon: Shield, label: "Permissões", href: "/admin/permissions" },
  { icon: Settings, label: "Configurações", href: "/admin/settings" },
];

export function AdminLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const handleLogout = () => {
    api.logout();
    window.location.href = "/auth/login";
  };

  const userName = localStorage.getItem("userName") || "Admin";
  const userEmail = localStorage.getItem("userEmail") || "admin@email.com";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "A";

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
              <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center">
                <Shield className="h-4 w-4 text-destructive-foreground" />
              </div>
              <span className="font-bold text-lg">Admin Panel</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center mx-auto">
              <Shield className="h-4 w-4 text-destructive-foreground" />
            </div>
          )}
        </div>

        {/* Toggle Button */}
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
            {adminSidebarItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    active
                      ? "bg-destructive text-destructive-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", active && "text-destructive-foreground")} />
                  {!sidebarCollapsed && (
                    <span className="flex-1 font-medium">{item.label}</span>
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
              <AvatarFallback className="bg-destructive/20 text-destructive">{userInitials}</AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
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
            <h1 className="text-lg font-semibold">Painel Administrativo</h1>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarFallback className="bg-destructive text-destructive-foreground">{userInitials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

