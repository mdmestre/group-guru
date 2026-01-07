/**
 * WhatsApp Connections Page - CORRIGIDO
 * Problemas corrigidos:
 * - Loop infinito no useEffect (removidas dependências problemáticas)
 * - Handlers usando updateInstanceStatus ao invés de refetch
 * - Filtro por connectionId nos eventos
 * - Auto-refresh removido (interfere na conexão)
 */

import { useEffect, useRef, useMemo } from "react";
import { getSocket } from "@/lib/socket";
import { 
  Smartphone, 
  CheckCircle2, 
  Info,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InstanceCard } from "@/components/whatsapp/InstanceCard";
import { AddInstanceCard } from "@/components/whatsapp/AddInstanceCard";
import { useWhatsAppConnections } from "@/hooks/useWhatsAppConnections";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function WhatsAppConnections() {
  const { company } = useAuth();
  const {
    instances,
    stats,
    isLoading,
    createConnection,
    connect,
    disconnect,
    deleteConnection,
    renameConnection,
    refreshConnection,
    updateInstanceStatus
  } = useWhatsAppConnections();

  // Socket.IO - CORRIGIDO: usando useRef para evitar loops
  // Usar useRef para manter referências estáveis SEM causar re-renders
  const updateInstanceStatusRef = useRef(updateInstanceStatus);
  const instancesRef = useRef(instances);
  
  // Memoizar company.id para evitar re-criação do useEffect
  const companyId = useMemo(() => company?.id, [company?.id]);
  
  // Atualizar refs SEM criar useEffect separado (evita loops)
  // Atualizar diretamente no render, não em useEffect
  updateInstanceStatusRef.current = updateInstanceStatus;
  instancesRef.current = instances;

  // Socket.IO - CORRIGIDO: sem dependências que causam loop
  useEffect(() => {
    const socket = getSocket();
    if (!companyId) return;

    console.log('🔌 Setting up socket listeners for company:', companyId);

    // Handler de status - usa refs para evitar dependências
    const onStatus = (data: unknown) => {
      const d = data as Record<string, unknown>;
      const status = d['status'] as string | undefined;
      const qrCode = d['qrCode'] as string | undefined;
      const connectionId = d['connectionId'] as string | undefined;

      // Se não tem connectionId, ignora (evento global não específico)
      if (!connectionId) {
        console.log('⚠️ Status event sem connectionId, ignorando');
        return;
      }

      console.log('📡 Status event:', { connectionId, status, hasQR: !!qrCode });
      console.log('📋 Instâncias atuais:', instancesRef.current.map(i => ({ id: i.id, connectionId: i.connectionId, status: i.status })));

      // Atualiza diretamente a instância específica usando ref
      const updates: any = {};
      if (status === 'connecting' || status === 'waiting_qr') {
        updates.status = status;
        if (qrCode) {
          updates.qrCode = qrCode;
        }
      } else if (status === 'connected') {
        updates.status = 'connected';
        updates.qrCode = undefined;
      }

      if (Object.keys(updates).length > 0) {
        console.log('🔄 Atualizando instância:', { connectionId, updates });
        updateInstanceStatusRef.current(connectionId, updates);
      }
    };

    // Handler de QR - usa refs
    const onQR = (qr: string, connectionIdParam?: string) => {
      console.log('📱 QR event:', { connectionIdParam, hasQR: !!qr, qrLength: qr?.length });
      console.log('📋 Instâncias atuais:', instancesRef.current.map(i => ({ id: i.id, connectionId: i.connectionId, status: i.status })));
      
      if (connectionIdParam) {
        console.log('🔄 Atualizando QR com connectionId:', connectionIdParam);
        updateInstanceStatusRef.current(connectionIdParam, {
          qrCode: qr,
          status: 'waiting_qr'
        });
        toast.success('QR Code gerado!');
      } else {
        // Fallback usando ref
        console.log('⚠️ QR event sem connectionId, tentando fallback');
        const waitingInstance = instancesRef.current.find(inst => 
          inst.status === 'waiting_qr' || inst.status === 'connecting'
        );
        if (waitingInstance) {
          console.log('🔄 Atualizando QR via fallback:', waitingInstance.connectionId);
          updateInstanceStatusRef.current(waitingInstance.connectionId, {
            qrCode: qr,
            status: 'waiting_qr'
          });
          toast.success('QR Code gerado!');
        } else {
          console.error('❌ Não encontrou instância para atualizar QR');
        }
      }
    };

    // Handler de connected - usa refs
    const onConnected = (connectionIdParam?: string) => {
      console.log('✅ Connected event:', { connectionIdParam });
      
      if (connectionIdParam) {
        updateInstanceStatusRef.current(connectionIdParam, {
          status: 'connected',
          qrCode: undefined
        });
        toast.success('WhatsApp conectado!');
      } else {
        const connectingInstance = instancesRef.current.find(inst => 
          inst.status === 'waiting_qr' || inst.status === 'connecting'
        );
        if (connectingInstance) {
          updateInstanceStatusRef.current(connectingInstance.connectionId, {
            status: 'connected',
            qrCode: undefined
          });
          toast.success('WhatsApp conectado!');
        }
      }
    };

    // Subscribe to company room
    socket.emit('subscribe-company-connections', companyId);

    // Listen to events
    socket.on('status', onStatus);
    socket.on('qr', onQR);
    socket.on('connected', onConnected);

    // Request status on connect
    const onSocketConnect = () => {
      console.log('✅ Socket conectado');
      socket.emit('subscribe-company-connections', companyId);
    };
    socket.on('connect', onSocketConnect);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('status', onStatus);
      socket.off('qr', onQR);
      socket.off('connected', onConnected);
      socket.off('connect', onSocketConnect);
    };
  }, [companyId]); // APENAS companyId memoizado - handlers usam refs

  const connectedCount = instances.filter(i => i.status === 'connected').length;
  const remainingSlots = stats.remaining;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando conexões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conexões WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie as instâncias WhatsApp conectadas à sua empresa
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-4 rounded-xl bg-card border">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm">
            <span className="font-semibold">{connectedCount}</span>
            <span className="text-muted-foreground"> conectado{connectedCount !== 1 ? 's' : ''}</span>
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-semibold">{stats.total}</span>
            <span className="text-muted-foreground"> de {stats.limit} instâncias</span>
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {[...Array(Math.min(5, remainingSlots))].map((_, i) => (
              <div 
                key={i} 
                className="h-3 w-3 rounded-full border-2 border-card bg-muted"
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {remainingSlots} disponíve{remainingSlots !== 1 ? 'is' : 'l'}
          </span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/50 border border-accent">
        <Info className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-accent-foreground">Sessões persistentes</p>
          <p className="text-muted-foreground mt-0.5">
            Suas conexões são mantidas automaticamente. Se uma sessão cair, você será notificado e poderá reconectar rapidamente.
          </p>
        </div>
      </div>

      {/* Instances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {instances.map(instance => (
          <InstanceCard
            key={instance.id}
            instance={instance}
            onConnect={connect}
            onDisconnect={disconnect}
            onDelete={deleteConnection}
            onRename={renameConnection}
            onRefresh={refreshConnection}
          />
        ))}
        
        <AddInstanceCard 
          onAdd={createConnection}
          disabled={remainingSlots <= 0}
          remainingSlots={remainingSlots}
        />
      </div>

      {/* Empty state */}
      {instances.length === 0 && (
        <div className="text-center py-12">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Nenhuma conexão ainda</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Adicione sua primeira conexão WhatsApp para começar a usar as automações e disparos.
          </p>
        </div>
      )}
    </div>
  );
}
