import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { LogEntry } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityLogProps {
  logs: LogEntry[];
}

const logConfig = {
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-secondary" },
  success: { icon: CheckCircle2, color: "text-primary", bg: "bg-accent" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  error: { icon: CheckCircle2, color: "text-destructive", bg: "bg-destructive/10" }, // Assuming error uses CheckCircle2 or adjust as needed
};

export function ActivityLog({ logs }: ActivityLogProps) {
  return (
    <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden animate-fade-in h-full m-[13px]" style={{ height: "450px", width: "421px" }}>
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-secondary">
            <Activity className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Log de Atividades</h3>
            <p className="text-sm text-muted-foreground">Acompanhe o progresso em tempo real</p>
          </div>
        </div>
      </div>

      <ScrollArea className="h-80">
        <div className="p-4 space-y-2">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma atividade ainda</p>
              <p className="text-sm text-muted-foreground/70">Inicie o bot para ver os logs</p>
            </div>
          ) : (
            logs.map((log) => {
              const config = logConfig[log.type];
              const LogIcon = config.icon;
              
              return (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-colors",
                    config.bg
                  )}
                >
                  <LogIcon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", config.color === "text-muted-foreground" ? "text-foreground" : config.color)}>
                      {log.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(log.timestamp, "HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
