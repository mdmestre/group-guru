import { MessageCircle, Menu, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2 rounded-lg">
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">WhatsApp Groups</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Automação de Grupos</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={cn(
                "text-sm font-medium transition-colors",
                isActive("/") ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              Dashboard
            </Link>
            <Link 
              to="/crm" 
              className={cn(
                "text-sm font-medium transition-colors flex items-center gap-1",
                isActive("/crm") ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Users className="h-4 w-4" />
              CRM
            </Link>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Relatórios
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Ajuda
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              Documentação
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={cn(
          "md:hidden overflow-hidden transition-all duration-200",
          mobileMenuOpen ? "max-h-48 pb-4" : "max-h-0"
        )}>
          <nav className="flex flex-col gap-2">
            <Link 
              to="/" 
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive("/") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/crm" 
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                isActive("/crm") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users className="h-4 w-4" />
              CRM
            </Link>
            <a href="#" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
              Relatórios
            </a>
            <a href="#" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
              Ajuda
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
