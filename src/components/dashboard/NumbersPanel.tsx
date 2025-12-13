import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Trash2, Users, CheckCircle2, Send, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneNumber } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NumbersPanelProps {
  numbers: PhoneNumber[];
  onUpload: (numbers: string[]) => void;
  onClear: () => void;
}

const statusConfig = {
  pending: { icon: Clock, label: "Pendente", color: "text-muted-foreground" },
  added: { icon: CheckCircle2, label: "Adicionado", color: "text-primary" },
  link_sent: { icon: Send, label: "Link Enviado", color: "text-warning" },
  failed: { icon: AlertCircle, label: "Falhou", color: "text-destructive" },
};

export function NumbersPanel({ numbers, onUpload, onClear }: NumbersPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const stats = {
    total: numbers.length,
    pending: numbers.filter(n => n.status === 'pending').length,
    added: numbers.filter(n => n.status === 'added').length,
    linkSent: numbers.filter(n => n.status === 'link_sent').length,
    failed: numbers.filter(n => n.status === 'failed').length,
  };

  const handleFileSelect = (file: File) => {
    // Simular leitura do arquivo
    const mockNumbers = [
      "5511999999999",
      "5511988888888",
      "5511977777777",
      "5511966666666",
      "5511955555555",
    ];
    
    onUpload(mockNumbers);
    toast({
      title: "Arquivo carregado",
      description: `${mockNumbers.length} números foram importados com sucesso.`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileSelect(file);
    } else {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: "Por favor, envie um arquivo Excel (.xlsx ou .xls)",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-secondary">
              <Users className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Lista de Números</h3>
              <p className="text-sm text-muted-foreground">{stats.total} números carregados</p>
            </div>
          </div>
          {stats.total > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {stats.total > 0 && (
        <div className="px-5 py-3 bg-secondary/30 border-b border-border/50">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{stats.pending} pendentes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">{stats.added} adicionados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-warning" />
              <span className="text-warning">{stats.linkSent} links</span>
            </div>
            {stats.failed > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-destructive">{stats.failed} falhas</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-5">
        {stats.total === 0 ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
              isDragging 
                ? "border-primary bg-accent" 
                : "border-border hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "p-4 rounded-full transition-colors",
                isDragging ? "bg-primary/10" : "bg-secondary"
              )}>
                <FileSpreadsheet className={cn(
                  "h-8 w-8",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {isDragging ? "Solte o arquivo aqui" : "Arraste seu arquivo Excel"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou clique para selecionar (.xlsx, .xls)
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-2">
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {numbers.slice(0, 50).map((num) => {
              const StatusIcon = statusConfig[num.status].icon;
              return (
                <div
                  key={num.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <span className="font-mono text-sm text-foreground">{num.number}</span>
                  <div className={cn("flex items-center gap-1.5 text-sm", statusConfig[num.status].color)}>
                    <StatusIcon className="h-4 w-4" />
                    <span>{statusConfig[num.status].label}</span>
                  </div>
                </div>
              );
            })}
            {numbers.length > 50 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                ... e mais {numbers.length - 50} números
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
