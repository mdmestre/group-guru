import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket";
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

export function HomePage() {
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
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Use a single socket instance for real-time updates
  useEffect(() => {
    const socket = getSocket();
    // expose for compatibility with other code
    Reflect.set(window, 'socket', socket);

    const onStatus = (data: unknown) => {
      const d = data as Record<string, unknown>;
      const status = d['status'] as string | undefined;

      setConnection((prev) => {
        if (status === 'connecting') {
          const qr = d['qrCode'] as string | undefined;
          return { status: 'connecting', qrCode: qr ?? prev?.qrCode } as ConnectionStatus;
        }
        if (status === 'connected') {
          return { status: 'connected' } as ConnectionStatus;
        }
        return { status: 'disconnected' } as ConnectionStatus;
      });

      if (d['cycleStatus']) setCycleStatus(d['cycleStatus'] as CycleStatus);

      const numbersRaw = d['numbers'];
      if (Array.isArray(numbersRaw)) setNumbers(numbersRaw as PhoneNumber[]);

      const groupsRaw = d['groups'];
      if (Array.isArray(groupsRaw)) {
        setGroups(groupsRaw as Array<{id:string,nome:string,membros:number}>);
        const sel = d['selectedGroup'] as string | undefined;
        if (sel) setSelectedGroup(sel);
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
          const token = localStorage.getItem('token');
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/groups`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          })
          const json = await res.json()
          if (json?.success && json.grupos) setGroups(json.grupos)
          if (json?.grupos?.length) setSelectedGroup(json.grupos[0].id)
        } catch (e) {
          console.error('Erro ao buscar grupos:', e);
        }
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
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/set-group`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ groupId })
      })
      setSelectedGroup(groupId)
      addLog('info', `Grupo selecionado: ${groupId}`)
    } catch (e) {
      console.error('Erro ao selecionar grupo:', e);
    }
  }

  const handleDisconnect = () => {
    setConnection({ status: 'disconnected' });
    setCycleStatus(prev => ({ ...prev, isRunning: false }));
    addLog('info', 'Desconectado do WhatsApp');
  };

  const handleUploadNumbers = async (newNumbers: string[]) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/upload-numbers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ newNumbers }),
      });
      const phoneNumbers: PhoneNumber[] = newNumbers.map((num, index) => ({
        id: `num-${Date.now()}-${index}`,
        number: num,
        status: 'pending',
      }));
      setNumbers(phoneNumbers);
      addLog('info', `${newNumbers.length} números importados`);
    } catch (e) {
      console.error('Erro ao fazer upload de números:', e);
      toast({ variant: "destructive", title: 'Erro', description: 'Erro ao fazer upload de números.' });
    }
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

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/start-cycle`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
      toast({ variant: "destructive", title: 'Erro de Conexão', description: 'Não foi possível conectar ao servidor.' });
    }
  };

  const handlePauseCycle = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/pause-cycle`, { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      setCycleStatus(prev => ({ ...prev, isRunning: false, nextCycleAt: undefined }));
      addLog('warning', 'Bot pausado');
    } catch (e) {
      console.error('Erro ao pausar ciclo:', e);
      toast({ variant: "destructive", title: 'Erro', description: 'Erro ao pausar ciclo.' });
    }
  };

  const handleResetCycle = async () => {
    // Note: reset-cycle endpoint não existe no backend, apenas resetando localmente
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
    <div className="space-y-6">
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
    </div>
  );
}

