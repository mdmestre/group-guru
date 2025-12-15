import { MessageCircle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <h1 className="text-lg font-bold text-foreground">WhatsApp Grupos</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Automação de Grupos</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Dashboard
            </a>
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
            <a href="#" className="px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors">
              Dashboard
            </a>
            <a href="#" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
              Relatórios
            </a>
            <a href="#" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
              Ajuda
            </a>
            <a href="#" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
              Documentação
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
