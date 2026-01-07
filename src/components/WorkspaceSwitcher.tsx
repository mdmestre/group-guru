/**
 * Workspace Switcher Component
 * 
 * Allows users to switch between companies/workspaces.
 */

import { useState } from "react";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { company, companies, switchCompany, role } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);
  const navigate = useNavigate();

  const handleSwitch = async (companyId: string) => {
    if (companyId === company?.id) return;
    
    setIsSwitching(true);
    try {
      await switchCompany(companyId);
      // Optionally reload or redirect
      window.location.reload(); // Simple approach - could use navigate instead
    } catch (error) {
      console.error('Failed to switch company:', error);
      alert('Failed to switch workspace');
    } finally {
      setIsSwitching(false);
    }
  };

  const getRoleBadge = (r: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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
      <Badge variant={variants[r] || 'outline'} className="text-xs">
        {labels[r] || r}
      </Badge>
    );
  };

  if (!company) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-9 justify-between gap-2 min-w-[200px]",
            isSwitching && "opacity-50 cursor-not-allowed"
          )}
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium truncate">{company.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {companies.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => handleSwitch(c.id)}
            className="flex items-center justify-between gap-2"
            disabled={isSwitching}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{c.name}</span>
                  {c.id === company.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.slug}
                </div>
              </div>
            </div>
            {getRoleBadge(c.role)}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/companies/new')}
          className="text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

