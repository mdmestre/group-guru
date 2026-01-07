import { useState } from "react";
import { 
  Smartphone, 
  QrCode, 
  MoreVertical, 
  Trash2, 
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  Edit2
} from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { WhatsAppInstance, WhatsAppInstanceStatus } from "@/types/whatsapp";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InstanceCardProps {
  instance: WhatsAppInstance;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRefresh: (id: string) => void;
}

const statusConfig: Record<WhatsAppInstanceStatus, {
  label: string;
  color: string;
  icon: typeof Wifi;
  bgColor: string;
}> = {
  connected: {
    label: "Conectado",
    color: "text-success",
    icon: CheckCircle2,
    bgColor: "bg-success/10"
  },
  connecting: {
    label: "Conectando",
    color: "text-warning",
    icon: Loader2,
    bgColor: "bg-warning/10"
  },
  waiting_qr: {
    label: "Aguardando QR",
    color: "text-primary",
    icon: QrCode,
    bgColor: "bg-primary/10"
  },
  disconnected: {
    label: "Desconectado",
    color: "text-muted-foreground",
    icon: WifiOff,
    bgColor: "bg-muted"
  },
  error: {
    label: "Erro",
    color: "text-destructive",
    icon: AlertTriangle,
    bgColor: "bg-destructive/10"
  }
};

export function InstanceCard({
  instance,
  onConnect,
  onDisconnect,
  onDelete,
  onRename,
  onRefresh
}: InstanceCardProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(instance.name);
  const status = statusConfig[instance.status];
  const StatusIcon = status.icon;

  // Debug log
  console.log(`🎴 InstanceCard render:`, { 
    id: instance.id, 
    status: instance.status, 
    hasQR: !!instance.qrCode,
    qrCodeLength: instance.qrCode?.length 
  });

  const handleRename = () => {
    if (newName.trim()) {
      onRename(instance.id, newName.trim());
      setRenameOpen(false);
    }
  };

  return (
    <>
      <div className={cn(
        "group relative rounded-xl border bg-card p-5 transition-all duration-200",
        "hover:shadow-elevated hover:border-border/80",
        instance.status === 'error' && "border-destructive/30",
        instance.status === 'connected' && "border-success/30"
      )}>
        {/* Status indicator line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-0.5 rounded-t-xl transition-all",
          instance.status === 'connected' && "bg-success",
          instance.status === 'connecting' && "bg-warning",
          instance.status === 'waiting_qr' && "bg-primary",
          instance.status === 'error' && "bg-destructive",
          instance.status === 'disconnected' && "bg-muted-foreground/30"
        )} />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
              status.bgColor
            )}>
              <Smartphone className={cn("h-5 w-5", status.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{instance.name}</h3>
              {instance.phoneNumber && (
                <p className="text-sm text-muted-foreground">{instance.phoneNumber}</p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setNewName(instance.name);
                setRenameOpen(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRefresh(instance.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(instance.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className={cn("gap-1.5", status.bgColor, status.color)}>
            <StatusIcon className={cn(
              "h-3 w-3",
              instance.status === 'connecting' && "animate-spin"
            )} />
            {status.label}
          </Badge>
          
          {instance.status === 'connected' && instance.batteryLevel !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {instance.isCharging ? (
                <BatteryCharging className="h-3.5 w-3.5" />
              ) : (
                <Battery className="h-3.5 w-3.5" />
              )}
              {instance.batteryLevel}%
            </div>
          )}
        </div>

        {/* QR Code Section - Usando QRCodeSVG como no DashboardPanel */}
        {(instance.status === 'waiting_qr' || instance.status === 'connecting') && instance.qrCode && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-center p-6 bg-secondary/50 rounded-lg">
              <div className="text-center space-y-3">
                {instance.qrCode && typeof instance.qrCode === 'string' && instance.qrCode.length > 0 ? (
                  <div className="flex justify-center">
                    <QRCodeSVG value={instance.qrCode} size={256} />
                  </div>
                ) : (
                  <div className="h-64 w-64 flex items-center justify-center text-sm text-muted-foreground">
                    Erro ao gerar QR Code
                  </div>
                )}
                <p className="text-sm text-muted-foreground max-w-xs">
                  Escaneie o QR Code com seu WhatsApp para conectar
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading quando está conectando mas ainda não tem QR */}
        {instance.status === 'connecting' && !instance.qrCode && (
          <div className="mb-4 flex items-center justify-center p-6 bg-secondary/50 rounded-lg">
            <div className="text-center space-y-3">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                Gerando QR Code...
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {instance.status === 'error' && instance.errorMessage && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">{instance.errorMessage}</p>
          </div>
        )}

        {/* Last Activity */}
        {instance.lastActivity && instance.status !== 'waiting_qr' && (
          <p className="text-xs text-muted-foreground mb-4">
            Última atividade: {formatDistanceToNow(instance.lastActivity, { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {instance.status === 'disconnected' && (
            <Button 
              onClick={() => onConnect(instance.id)} 
              className="w-full"
              size="sm"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Conectar
            </Button>
          )}
          {instance.status === 'waiting_qr' && (
            <Button 
              onClick={() => onDisconnect(instance.id)} 
              variant="outline"
              className="w-full"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar Conexão
            </Button>
          )}
          {instance.status === 'connecting' && (
            <Button 
              variant="outline"
              className="w-full"
              size="sm"
              disabled
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Conectando...
            </Button>
          )}
          {instance.status === 'connected' && (
            <Button 
              onClick={() => onDisconnect(instance.id)} 
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              size="sm"
            >
              <WifiOff className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          )}
          {instance.status === 'error' && (
            <Button 
              onClick={() => onConnect(instance.id)} 
              className="w-full"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          )}
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear instância</DialogTitle>
            <DialogDescription>
              Escolha um nome para identificar esta conexão WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Vendas, Suporte, Marketing"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRename}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
