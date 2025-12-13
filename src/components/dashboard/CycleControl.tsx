import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CycleStatus } from "@/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

interface CycleControlProps {
  status: CycleStatus;
  isConnected: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function CycleControl({ status, isConnected, onStart, onPause, onReset }: CycleControlProps) {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!status.nextCycleAt) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const diff = differenceInSeconds(status.nextCycleAt!, new Date());
      if (diff <= 0) {
        setCountdown(null);
      } else {
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [status.nextCycleAt]);

  return (
    <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-lg",
            status.isRunning ? "bg-primary/10" : "bg-secondary"
          )}>
            <Timer className={cn(
              "h-5 w-5",
              status.isRunning ? "text-primary" : "text-secondary-foreground"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Controle do Bot</h3>
            <p className="text-sm text-muted-foreground">
              {status.isRunning ? "Bot em execução" : "Bot pausado"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">{status.currentCycle}</p>
            <p className="text-xs text-muted-foreground">Ciclo Atual</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">{status.processedInCycle}</p>
            <p className="text-xs text-muted-foreground">Processados</p>
          </div>
        </div>

        {/* Countdown */}
        {countdown && status.isRunning && (
          <div className="p-4 bg-accent rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Próximo ciclo em</p>
            <p className="text-3xl font-bold text-primary font-mono">{countdown}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {status.isRunning ? (
            <Button 
              variant="warning" 
              className="flex-1" 
              onClick={onPause}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </Button>
          ) : (
            <Button 
              variant="whatsapp" 
              className="flex-1" 
              onClick={onStart}
              disabled={!isConnected}
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={onReset}
            disabled={status.isRunning}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {!isConnected && (
          <p className="text-xs text-center text-muted-foreground">
            Conecte seu WhatsApp para iniciar o bot
          </p>
        )}
      </div>
    </div>
  );
}
