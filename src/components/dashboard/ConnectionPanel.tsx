import { Smartphone, Wifi, WifiOff, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "@/types";
import { cn } from "@/lib/utils";

interface ConnectionPanelProps {
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectionPanel({ status, onConnect, onDisconnect }: ConnectionPanelProps) {
  const isConnected = status.status === 'connected';
  const isConnecting = status.status === 'connecting';

  return (
    <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-lg",
            isConnected ? "bg-primary/10" : "bg-secondary"
          )}>
            <Smartphone className={cn(
              "h-5 w-5",
              isConnected ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Conexão WhatsApp</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn(
                "inline-flex h-2 w-2 rounded-full",
                isConnected ? "bg-primary animate-pulse" : 
                isConnecting ? "bg-warning animate-pulse" : "bg-muted-foreground"
              )} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? "Conectado" : isConnecting ? "Conectando..." : "Desconectado"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {isConnecting && status.qrCode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-secondary/50 rounded-lg">
              <div className="text-center space-y-3">
                <img src={status.qrCode} alt="QR Code" className="h-32 w-32 mx-auto" />
                <p className="text-sm text-muted-foreground max-w-xs">
                  Escaneie o QR Code com seu WhatsApp para conectar
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={onDisconnect}>
              Cancelar
            </Button>
          </div>
        ) : isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
              <Wifi className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-accent-foreground">Pronto para usar</p>
                <p className="text-sm text-muted-foreground">Seu bot está ativo e funcionando</p>
              </div>
            </div>
            <Button variant="destructive" className="w-full" onClick={onDisconnect}>
              <WifiOff className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Conecte seu WhatsApp para começar a adicionar membros ao grupo
            </p>
            <Button variant="whatsapp" className="w-full" size="lg" onClick={onConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Smartphone className="h-4 w-4 mr-2" />
              )}
              Conectar WhatsApp
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
