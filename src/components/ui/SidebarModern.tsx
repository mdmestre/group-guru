import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Menu, LogOut, ChevronLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Item = { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  href: string; 
  badge?: string 
};

interface SidebarModernProps {
  items: Item[];
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isActive: (href: string) => boolean;
  userName: string;
  userEmail: string;
  userInitials: string;
  onLogout: () => void;
}

export default function SidebarModern({
  items,
  collapsed,
  setCollapsed,
  isActive,
  userName,
  userEmail,
  userInitials,
  onLogout,
}: SidebarModernProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out flex flex-col glass-sidebar shadow-elevated",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border/50 bg-sidebar">
          {!collapsed ? (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-foreground">Stracta</span>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">WhatsApp SaaS</p>
              </div>
            </div>
          ) : (
            <div className="h-10 w-10 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="h-8 w-8 hover:bg-sidebar-accent"
              >
                {collapsed ? (
                  <Menu className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expandir" : "Recolher"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 scrollbar-thin">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const content = (
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                  active ? "text-primary-foreground scale-110" : "group-hover:scale-105"
                )} />
                {!collapsed && (
                  <>
                    <span className="flex-1 font-medium text-sm truncate">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "h-5 min-w-[20px] text-xs font-semibold",
                          active && "bg-primary-foreground/20 text-primary-foreground"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {active && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
                )}
              </div>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Link to={item.href} className="block">
                      {content}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="h-4 text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={item.label} to={item.href}>
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border/50 space-y-3 bg-sidebar">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <Avatar className="h-10 w-10 ring-2 ring-sidebar-border">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-semibold truncate text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            )}
          </div>

          {!collapsed && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout} 
              className="w-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
