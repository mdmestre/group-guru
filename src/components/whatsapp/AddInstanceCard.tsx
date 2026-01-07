import { useState } from "react";
import { Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AddInstanceCardProps {
  onAdd: (name: string) => void;
  disabled?: boolean;
  remainingSlots: number;
}

export function AddInstanceCard({ onAdd, disabled, remainingSlots }: AddInstanceCardProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            "relative rounded-xl border-2 border-dashed p-5 transition-all duration-200 min-h-[200px]",
            "flex flex-col items-center justify-center gap-3 text-center",
            disabled 
              ? "border-muted cursor-not-allowed opacity-50" 
              : "border-border hover:border-primary/50 hover:bg-accent/30 cursor-pointer group"
          )}
        >
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
            disabled ? "bg-muted" : "bg-primary/10 group-hover:bg-primary/20"
          )}>
            <Plus className={cn(
              "h-6 w-6 transition-colors",
              disabled ? "text-muted-foreground" : "text-primary"
            )} />
          </div>
          <div>
            <p className={cn(
              "font-medium",
              disabled ? "text-muted-foreground" : "text-foreground"
            )}>
              {disabled ? "Limite atingido" : "Adicionar conexão"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {disabled 
                ? "Máximo de 10 instâncias" 
                : `${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} disponíve${remainingSlots !== 1 ? 'is' : 'l'}`
              }
            </p>
          </div>
        </button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Nova conexão WhatsApp
          </DialogTitle>
          <DialogDescription>
            Adicione um novo número WhatsApp à sua empresa. Você poderá escanear o QR code após criar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="instance-name">Nome da instância</Label>
            <Input
              id="instance-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendas, Suporte, Marketing..."
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <p className="text-xs text-muted-foreground">
              Use um nome que identifique o propósito deste WhatsApp.
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={!name.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar instância
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
