import { useState } from "react";
import { Settings, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CycleConfig } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ConfigPanelProps {
  config: CycleConfig;
  onSave: (config: CycleConfig) => void;
}

export function ConfigPanel({ config, onSave }: ConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState(config);
  const { toast } = useToast();

  const handleSave = () => {
    onSave(localConfig);
    toast({
      title: "Configurações salvas",
      description: "As configurações foram atualizadas com sucesso.",
    });
  };

  const handleReset = () => {
    setLocalConfig(config);
    toast({
      title: "Configurações restauradas",
      description: "As configurações voltaram ao estado original.",
    });
  };

  return (
    <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-secondary">
            <Settings className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Configurações do Ciclo</h3>
            <p className="text-sm text-muted-foreground">Ajuste os parâmetros de processamento</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="groupId" className="text-sm font-medium">
            ID do Grupo
          </Label>
          <Input
            id="groupId"
            value={localConfig.groupId}
            onChange={(e) => setLocalConfig({ ...localConfig, groupId: e.target.value })}
            placeholder="120363423646323874@g.us"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            O identificador único do grupo do WhatsApp
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addPerCycle" className="text-sm font-medium">
              Adicionar por Ciclo
            </Label>
            <Input
              id="addPerCycle"
              type="number"
              min="1"
              max="50"
              value={localConfig.addPerCycle}
              onChange={(e) => setLocalConfig({ ...localConfig, addPerCycle: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkPerCycle" className="text-sm font-medium">
              Links por Ciclo
            </Label>
            <Input
              id="linkPerCycle"
              type="number"
              min="1"
              max="100"
              value={localConfig.linkPerCycle}
              onChange={(e) => setLocalConfig({ ...localConfig, linkPerCycle: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cycleMinutes" className="text-sm font-medium">
              Intervalo (min)
            </Label>
            <Input
              id="cycleMinutes"
              type="number"
              min="5"
              max="120"
              value={localConfig.cycleMinutes}
              onChange={(e) => setLocalConfig({ ...localConfig, cycleMinutes: parseInt(e.target.value) || 5 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="messageTemplate" className="text-sm font-medium">
            Mensagem de Convite
          </Label>
          <Textarea
            id="messageTemplate"
            value={localConfig.messageTemplate}
            onChange={(e) => setLocalConfig({ ...localConfig, messageTemplate: e.target.value })}
            placeholder="Digite a mensagem que será enviada junto com o link..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Use <code className="px-1 py-0.5 bg-secondary rounded text-xs">{'{link}'}</code> para inserir o link do grupo
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="whatsapp" className="flex-1" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
