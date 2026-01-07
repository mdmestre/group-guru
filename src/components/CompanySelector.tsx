/**
 * Company Selector Component
 * 
 * Modal/dialog to select company when user has multiple memberships.
 * Shows after login if user has more than one company.
 */

import { useState } from "react";
import { Building2, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Company {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface CompanySelectorProps {
  companies: Company[];
  isOpen: boolean;
  onSelect: (companyId: string) => Promise<void>;
  isLoading?: boolean;
}

export function CompanySelector({
  companies,
  isOpen,
  onSelect,
  isLoading = false,
}: CompanySelectorProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      owner: 'default',
      admin: 'secondary',
      member: 'outline',
      viewer: 'outline'
    };
    
    const labels: Record<string, string> = {
      owner: 'Owner',
      admin: 'Admin',
      member: 'Member',
      viewer: 'Viewer'
    };

    return (
      <Badge variant={variants[role] || 'outline'} className="text-xs">
        {labels[role] || role}
      </Badge>
    );
  };

  const handleSelect = async (companyId: string) => {
    if (isSelecting || isLoading) return;
    
    setSelectedCompanyId(companyId);
    setIsSelecting(true);
    
    try {
      await onSelect(companyId);
    } catch (error) {
      console.error('Failed to select company:', error);
      setSelectedCompanyId(null);
    } finally {
      setIsSelecting(false);
    }
  };

  if (companies.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Selecione um Workspace</DialogTitle>
          <DialogDescription>
            Você tem acesso a múltiplos workspaces. Selecione qual deseja usar agora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleSelect(company.id)}
              disabled={isSelecting || isLoading}
              className={cn(
                "w-full text-left p-4 rounded-lg border-2 transition-all",
                "hover:border-primary hover:bg-accent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                selectedCompanyId === company.id
                  ? "border-primary bg-accent"
                  : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{company.name}</span>
                      {selectedCompanyId === company.id && isSelecting && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {selectedCompanyId === company.id && !isSelecting && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {company.slug}
                    </p>
                   </div>
                 </div>
                 {getRoleBadge(company.role || 'member')}
              </div>
            </button>
          ))}
        </div>

        {isSelecting && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando workspace...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

