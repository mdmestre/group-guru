import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { ConnectionPanel } from "@/components/dashboard/ConnectionPanel";
import { ConfigPanel } from "@/components/dashboard/ConfigPanel";
import { NumbersPanel } from "@/components/dashboard/NumbersPanel";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { CycleControl } from "@/components/dashboard/CycleControl";
import { Users, CheckCircle2, Send, AlertCircle } from "lucide-react";
import { CycleConfig, ConnectionStatus, CycleStatus, PhoneNumber, LogEntry } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Default configuration
const defaultConfig: CycleConfig = {
  groupId: "120363423646323874@g.us",
  addPerCycle: 8,
  linkPerCycle: 20,
  cycleMinutes: 35,
  messageTemplate: `🔥 BLACK DEZEMBER – PERFUMES IMPORTADOS 🔥

Os melhores perfumes importados com descontos de até 40% só em dezembro 
Entre agora no grupo e aproveite ofertas limitadas 👇 
{link}`,
};

// Mock data for demonstration
const mockLogs: LogEntry[] = [
  { id: "1", timestamp: new Date(), type: "info", message: "Sistema inicializado" },
  { id: "2", timestamp: new Date(Date.now() - 60000), type: "success", message: "Conectado ao WhatsApp" },
  { id: "3", timestamp: new Date(Date.now() - 120000), type: "success", message: "Adicionado: 5511999999999" },
  { id: "4", timestamp: new Date(Date.now() - 180000), type: "warning", message: "Falha ao adicionar: 5511988888888 - Número inválido" },
  { id: "5", timestamp: new Date(Date.now() - 240000), type: "success", message: "Link enviado: 5511977777777" },
];

const Index = () => {
  const { toast } = useToast();
  
  const [config, setConfig] = useState<CycleConfig>(defaultConfig);
  const [connection, setConnection] = useState<ConnectionStatus>({ status: 'disconnected' });
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>({
    isRunning: false,
    currentCycle: 0,
    processedInCycle: 0,
  });
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);

  // Stats calculation
  const stats = {
    total: numbers.length,
    added: numbers.filter(n => n.status === 'added').length,
    linkSent: numbers.filter(n => n.status === 'link_sent').length,
    failed: numbers.filter(n => n.status === 'failed').length,
  };

  // Handlers
  const handleConnect = () => {
    setConnection({ status: 'connecting', qrCode: 'mock-qr' });
    
    // Simulate connection after 3 seconds
    setTimeout(() => {
      setConnection({ status: 'connected' });
      addLog('success', 'Conectado ao WhatsApp com sucesso!');
      toast({
        title: "Conectado!",
        description: "Seu WhatsApp foi conectado com sucesso.",
      });
    }, 3000);
  };

  const handleDisconnect = () => {
    setConnection({ status: 'disconnected' });
    setCycleStatus(prev => ({ ...prev, isRunning: false }));
    addLog('info', 'Desconectado do WhatsApp');
  };

  const handleUploadNumbers = (newNumbers: string[]) => {
    const phoneNumbers: PhoneNumber[] = newNumbers.map((num, index) => ({
      id: `num-${Date.now()}-${index}`,
      number: num,
      status: 'pending',
    }));
    setNumbers(phoneNumbers);
    addLog('info', `${newNumbers.length} números importados`);
  };

  const handleClearNumbers = () => {
    setNumbers([]);
    addLog('info', 'Lista de números limpa');
  };

  const handleStartCycle = () => {
    setCycleStatus({
      isRunning: true,
      currentCycle: 1,
      processedInCycle: 0,
      nextCycleAt: new Date(Date.now() + config.cycleMinutes * 60 * 1000),
    });
    addLog('success', 'Bot iniciado - Ciclo 1 começou');
  };

  const handlePauseCycle = () => {
    setCycleStatus(prev => ({ ...prev, isRunning: false, nextCycleAt: undefined }));
    addLog('warning', 'Bot pausado');
  };

  const handleResetCycle = () => {
    setCycleStatus({
      isRunning: false,
      currentCycle: 0,
      processedInCycle: 0,
    });
    addLog('info', 'Contadores resetados');
  };

  const addLog = (type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      type,
      message,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Title */}
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Gerencie seu bot de grupos do WhatsApp</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard
            title="Total de Números"
            value={stats.total}
            subtitle="números carregados"
            icon={Users}
            variant="default"
          />
          <StatusCard
            title="Adicionados"
            value={stats.added}
            subtitle="direto no grupo"
            icon={CheckCircle2}
            variant="success"
          />
          <StatusCard
            title="Links Enviados"
            value={stats.linkSent}
            subtitle="convites enviados"
            icon={Send}
            variant="warning"
          />
          <StatusCard
            title="Falhas"
            value={stats.failed}
            subtitle="não processados"
            icon={AlertCircle}
            variant="danger"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <ConfigPanel config={config} onSave={setConfig} />
            <NumbersPanel 
              numbers={numbers} 
              onUpload={handleUploadNumbers}
              onClear={handleClearNumbers}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ConnectionPanel
              status={connection}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
            <CycleControl
              status={cycleStatus}
              isConnected={connection.status === 'connected'}
              onStart={handleStartCycle}
              onPause={handlePauseCycle}
              onReset={handleResetCycle}
            />
            <ActivityLog logs={logs} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            WhatsApp Groups Bot © {new Date().getFullYear()} — Automação inteligente para grupos
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
