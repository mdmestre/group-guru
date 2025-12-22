import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket";
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
  const [groups, setGroups] = useState<Array<{id:string,nome:string,membros:number}>>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);

  // Use a single socket instance for real-time updates
  useEffect(() => {
    const socket = getSocket();
    // expose for compatibility with other code
    (window as any).socket = socket;

    const onStatus = (data: any) => {
      setConnection((prev) => {
        if (data?.status === 'connecting') {
          return { status: 'connecting', qrCode: data.qrCode ?? prev?.qrCode } as ConnectionStatus;
        }
        if (data?.status === 'connected') {
          return { status: 'connected' } as ConnectionStatus;
        }
        return { status: 'disconnected' } as ConnectionStatus;
      });
      if (data.cycleStatus) setCycleStatus(data.cycleStatus);
      if (data.numbers) setNumbers(data.numbers);
      if (data.groups) {
        setGroups(data.groups);
        // if server includes selectedGroup, keep it
        if (data.selectedGroup) setSelectedGroup(data.selectedGroup)
      }
    };

    socket.on('status', onStatus);

    // some servers may emit specific events
    socket.on('qr', (qr: string) => {
      setConnection({ status: 'connecting', qrCode: qr });
    });
    socket.on('connected', () => {
      setConnection({ status: 'connected' });
      addLog('success', 'Conectado ao WhatsApp com sucesso!');
      toast({ title: 'Conectado!', description: 'Seu WhatsApp foi conectado com sucesso.' });
      // fetch groups list from backend
      (async () => {
        try {
          const res = await fetch('http://localhost:3001/groups')
          const json = await res.json()
          if (json?.success && json.grupos) setGroups(json.grupos)
          if (json?.grupos?.length) setSelectedGroup(json.grupos[0].id)
        } catch (e) {}
      })()
    });

    // request initial status — when socket connects and also now if already connected
    socket.on('connect', () => {
      console.log('✅ Socket conectado');
      socket.emit('get-status');
    });
    socket.emit('get-status');

    return () => {
      socket.off('status', onStatus);
      socket.off('qr');
      socket.off('connected');
      socket.off('connect');
    };
  }, []);

  // Stats calculation
  const stats = {
    total: numbers.length,
    added: numbers.filter(n => n.status === 'added').length,
    linkSent: numbers.filter(n => n.status === 'link_sent').length,
    failed: numbers.filter(n => n.status === 'failed').length,
  };

  // Handlers
  const handleConnect = () => {
    try {
      const socket = getSocket();
      socket.emit('connect-whatsapp');
    } catch (err) {
      console.warn('Falha ao emitir connect-whatsapp via socket:', err);
      toast({ title: 'Conexão indisponível', description: 'Socket não inicializado.' });
    }
  };

  const handleSelectGroup = async (groupId: string) => {
    try {
      await fetch('http://localhost:3001/set-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      })
      setSelectedGroup(groupId)
      addLog('info', `Grupo selecionado: ${groupId}`)
    } catch (e) {}
  }

  const handleDisconnect = () => {
    setConnection({ status: 'disconnected' });
    setCycleStatus(prev => ({ ...prev, isRunning: false }));
    addLog('info', 'Desconectado do WhatsApp');
  };

  const handleUploadNumbers = async (newNumbers: string[]) => {
    await fetch('http://localhost:3001/upload-numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newNumbers }),
    });
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

  const handleStartCycle = async () => {
    try {
      // Garantir que a config enviada tem o groupId correto antes de iniciar
      const finalConfig = {
        ...config,
        groupId: selectedGroup || config.groupId
      };

      const response = await fetch('http://localhost:3001/start-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: finalConfig }),
      });

      if (!response.ok) throw new Error("Erro no servidor");

      const data = await response.json();
      
      if (data.success && data.cycleStatus) {
        setCycleStatus(data.cycleStatus);
        addLog('success', 'Bot iniciado - Ciclo começou');
        toast({ title: 'Sucesso!', description: 'O ciclo de adições foi iniciado.' });
      } else {
        toast({ variant: "destructive", title: 'Erro', description: data.message || 'Falha ao iniciar ciclo.' });
      }
    } catch (err) {
      console.error("Erro ao iniciar ciclo:", err);
      toast({ variant: "destructive", title: 'Erro de Conexão', description: 'Não foi possível falar com o servidor na porta 3001.' });
    }
  };

  const handlePauseCycle = async () => {
    await fetch('http://localhost:3001/pause-cycle', { method: 'POST' });
    setCycleStatus(prev => ({ ...prev, isRunning: false, nextCycleAt: undefined }));
    addLog('warning', 'Bot pausado');
  };

  const handleResetCycle = async () => {
    await fetch('http://localhost:3001/reset-cycle', { method: 'POST' });
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
              groups={groups}
              selectedGroup={selectedGroup}
              onSelectGroup={handleSelectGroup}
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
