/**
 * Baileys Instance Service - REFATORADO
 * Baseado no código funcional do usuário
 */

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import P from "pino";
import fs from "fs";
import path from "path";

// AUTH STATE - Usar path absoluto
const AUTH_BASE_PATH = path.resolve('./baileys-auth');

// Map: connectionId -> instance
const baileysInstances = new Map();

// Map: connectionId -> creating promise (evita criação simultânea)
const creatingInstances = new Map();

// Garantir que o diretório base existe
fs.promises.mkdir(AUTH_BASE_PATH, { recursive: true }).catch(() => {});

// Socket.IO server (set by routes)
let ioServer = null;

/**
 * Create Baileys instance
 * Baseado no código funcional fornecido pelo usuário
 */
export async function createBaileysInstance(connectionId, companyId) {
  // Se já existe e está ativa, retorna a existente
  if (baileysInstances.has(connectionId)) {
    const inst = baileysInstances.get(connectionId);
    if (inst.sock && (inst.isConnecting || inst.isConnected)) {
      console.log(`✅ Instance ${connectionId} already exists and is active`);
      return inst;
    }
  }

  // Se já está sendo criada, aguarda a criação
  if (creatingInstances.has(connectionId)) {
    console.log(`⏳ Instance ${connectionId} already being created, waiting...`);
    return await creatingInstances.get(connectionId);
  }

  // Criar promise de criação e armazenar
  const createPromise = (async () => {
    try {
      console.log(`🔨 Creating Baileys instance for ${connectionId}`);
      
      // Busca a versão mais recente do Web API
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`Usando WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Configura a pasta onde ficarão salvos os dados da sessão
      const authPath = path.join(AUTH_BASE_PATH, connectionId);
      await fs.promises.mkdir(authPath, { recursive: true });
      console.log(`📁 Auth path: ${authPath}`);

      const { state, saveCreds } = await useMultiFileAuthState(authPath);

      const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true, // Gera QR no terminal também
        auth: state,
        generateHighQualityLinkPreview: true,
      });

      // Salva as credenciais sempre que houver atualização
      sock.ev.on('creds.update', saveCreds);

      const instance = {
        connectionId,
        companyId,
        sock,
        qrCodeData: null, // DataURL (para compatibilidade)
        qrCodeString: null, // String bruta do QR (para qrcode.react)
        isConnected: false,
        isConnecting: false,
        reconnectTimeout: null
      };
      
      // Armazenar instância ANTES de configurar handlers
      baileysInstances.set(connectionId, instance);
      console.log(`💾 Instance ${connectionId} stored in Map`);

      // Monitora a conexão - baseado no código funcional
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        console.log(`🔔 connection.update para ${connectionId}:`, { 
          connection, 
          hasQR: !!qr,
          qrLength: qr?.length || 0
        });

        // Gerar QR code
        if (qr) {
          // Armazena tanto a string bruta quanto o DataURL (para compatibilidade)
          instance.qrCodeData = await qrcode.toDataURL(qr);
          instance.qrCodeString = qr; // String bruta para qrcode.react
          instance.isConnecting = true;
          
          console.log(`📱 QR Code gerado para ${connectionId}, tamanho: ${qr.length} caracteres`);
          console.log(`📱 QR Code preview (primeiros 50 chars): ${qr.substring(0, 50)}...`);
          
          // Emitir QR via Socket.IO (envia a string bruta, não o DataURL)
          if (ioServer) {
            console.log(`📤 Emitindo QR via Socket.IO para ${connectionId}`);
            emitStatus(connectionId, {
              status: 'waiting_qr',
              qrCode: qr // Envia string bruta
            });
            emitQR(connectionId, qr); // Envia string bruta
          } else {
            console.error(`❌ ioServer não está definido! QR Code não pode ser emitido para ${connectionId}`);
          }
        }
        
        // Se está conectando mas ainda não tem QR, atualizar status
        if (connection === 'connecting' && !qr && !instance.isConnected) {
          instance.isConnecting = true;
          if (ioServer) {
            emitStatus(connectionId, {
              status: 'connecting'
            });
          }
        }

        // Conexão aberta
        if (connection === 'open') {
          instance.isConnected = true;
          instance.isConnecting = false;
          instance.qrCodeData = null;
          instance.qrCodeString = null;
          
          // Limpar timeout de reconexão se existir
          if (instance.reconnectTimeout) {
            clearTimeout(instance.reconnectTimeout);
            instance.reconnectTimeout = null;
          }
          
          console.log(`✅ Conectado ao WhatsApp com sucesso! (${connectionId})`);
          
          // Obter número de telefone do socket
          const phoneNumber = sock.user?.id ? sock.user.id.split(':')[0] : null;
          
          // Emitir status conectado
          if (ioServer) {
            emitStatus(connectionId, {
              status: 'connected',
              phoneNumber: phoneNumber
            });
            emitConnected(connectionId);
          }
        }

        // Conexão fechada
        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          console.log(`Conexão fechada devido a:`, lastDisconnect?.error, ', Reconectando:', shouldReconnect);
          
          instance.isConnected = false;
          instance.isConnecting = false;
          instance.qrCodeData = null;
          instance.qrCodeString = null;

          // Se não foi um "Logout" manual, tenta reconectar automaticamente
          if (shouldReconnect) {
            // Limpar timeout anterior se existir
            if (instance.reconnectTimeout) {
              clearTimeout(instance.reconnectTimeout);
            }
            
            console.log(`🔄 Tentando reconectar ${connectionId} em 5 segundos...`);
            
            // Reconectar após 5 segundos (como no código funcional)
            instance.reconnectTimeout = setTimeout(() => {
              console.log(`🔄 Reconectando ${connectionId}...`);
              // Chamar função de reconexão (usar companyId da instância)
              reconnectInstance(connectionId, instance.companyId);
            }, 5000);
          } else {
            // Foi logout manual, remover instância
            console.log(`🗑️ Logout manual detectado para ${connectionId}`);
            baileysInstances.delete(connectionId);
            
            if (ioServer) {
              emitStatus(connectionId, {
                status: 'disconnected'
              });
            }
            
            try {
              sock.end();
            } catch (e) {
              console.error('Error ending socket:', e);
            }
          }
        }
      });

      // Emitir status inicial de "connecting" assim que a instância é criada
      if (ioServer) {
        emitStatus(connectionId, {
          status: 'connecting'
        });
        console.log(`📤 Status inicial 'connecting' emitido para ${connectionId}`);
      }
      
      console.log(`✅ Instance ${connectionId} created successfully`);
      return instance;
    } catch (error) {
      console.error(`❌ Error creating instance ${connectionId}:`, error);
      // Remover da lista de criação em caso de erro
      creatingInstances.delete(connectionId);
      baileysInstances.delete(connectionId);
      throw error;
    } finally {
      // Remover da lista de criação após sucesso
      creatingInstances.delete(connectionId);
    }
  })();

  creatingInstances.set(connectionId, createPromise);
  return await createPromise;
}

/**
 * Reconecta uma instância existente
 */
async function reconnectInstance(connectionId, companyId) {
  // Limpar instância antiga
  const oldInstance = baileysInstances.get(connectionId);
  if (oldInstance && oldInstance.sock) {
    try {
      oldInstance.sock.ev.removeAllListeners();
      oldInstance.sock.end();
    } catch (e) {
      console.error('Error cleaning up old socket:', e);
    }
  }
  
  // Remover do Map para permitir recriação
  baileysInstances.delete(connectionId);
  
  // Criar nova instância
  console.log(`🔄 Recriando instância ${connectionId}...`);
  try {
    await createBaileysInstance(connectionId, companyId);
  } catch (error) {
    console.error(`❌ Error reconnecting instance ${connectionId}:`, error);
  }
}

/**
 * Emit status - CORRIGIDO: inclui connectionId no payload
 */
function emitStatus(connectionId, data) {
  if (!ioServer) {
    console.error(`❌ ioServer não está definido! Não é possível emitir status para ${connectionId}`);
    return;
  }
  
  // Adiciona connectionId ao payload para o frontend filtrar
  const payload = {
    ...data,
    connectionId
  };
  
  console.log(`📤 Emitindo status para ${connectionId}:`, { status: payload.status, hasQR: !!payload.qrCode });
  
  // Emit to connection room
  ioServer.to(`connection_${connectionId}`).emit('status', payload);
  
  // Extract companyId from connectionId (format: companyId_uuid)
  const parts = connectionId.split('_');
  const companyId = parts.length > 0 ? parts[0] : null;
  
  if (companyId) {
    // Emit to company room
    ioServer.to(`company_${companyId}`).emit('status', payload);
    console.log(`📤 Status também emitido para company room: company_${companyId}`);
  }
}

/**
 * Emit QR Code - CORRIGIDO: inclui connectionId no payload
 */
function emitQR(connectionId, qrCode) {
  if (!ioServer) {
    console.error(`❌ ioServer não está definido! Não é possível emitir QR para ${connectionId}`);
    return;
  }
  
  console.log(`📤 Emitindo QR para ${connectionId}, tamanho: ${qrCode?.length || 0} bytes`);
  
  // Emit to connection room com connectionId
  ioServer.to(`connection_${connectionId}`).emit('qr', qrCode, connectionId);
  
  // Extract companyId
  const parts = connectionId.split('_');
  const companyId = parts.length > 0 ? parts[0] : null;
  
  if (companyId) {
    // Emit to company room
    ioServer.to(`company_${companyId}`).emit('qr', qrCode, connectionId);
    console.log(`📤 QR também emitido para company room: company_${companyId}`);
  }
}

/**
 * Emit connected - CORRIGIDO: inclui connectionId no payload
 */
function emitConnected(connectionId) {
  if (!ioServer) return;
  
  // Emit to connection room com connectionId
  ioServer.to(`connection_${connectionId}`).emit('connected', connectionId);
  
  // Extract companyId
  const parts = connectionId.split('_');
  const companyId = parts.length > 0 ? parts[0] : null;
  
  if (companyId) {
    // Emit to company room
    ioServer.to(`company_${companyId}`).emit('connected', connectionId);
  }
  
  // Não emitir globalmente para evitar processamento desnecessário
  // ioServer.emit('connected', connectionId);
}

/**
 * Destroy instance
 */
export async function destroyBaileysInstance(connectionId) {
  const instance = baileysInstances.get(connectionId);
  if (!instance) {
    console.log(`⚠️ Instance ${connectionId} não encontrada para destruir`);
    return;
  }

  try {
    // Limpar timeout de reconexão se existir
    if (instance.reconnectTimeout) {
      clearTimeout(instance.reconnectTimeout);
      instance.reconnectTimeout = null;
    }
    
    // Remover listeners e encerrar socket
    if (instance.sock) {
      instance.sock.ev.removeAllListeners();
      try {
        instance.sock.end();
      } catch (e) {
        console.error('Error ending socket:', e);
      }
    }
    
    console.log(`🗑️ Instance ${connectionId} destruída`);
  } catch (e) {
    console.error('Error destroying instance:', e);
  }

  baileysInstances.delete(connectionId);
  
  // Emitir status de desconectado
  if (ioServer) {
    emitStatus(connectionId, {
      status: 'disconnected'
    });
  }
}

/**
 * Get instance status
 */
export function getBaileysInstanceStatus(connectionId) {
  const instance = baileysInstances.get(connectionId);
  if (!instance) {
    return {
      status: 'disconnected',
      qrCode: null,
      isConnected: false,
      isConnecting: false
    };
  }

  return {
    status: instance.isConnected ? 'connected' : instance.isConnecting ? 'connecting' : 'disconnected',
    qrCode: instance.qrCodeData,
    isConnected: instance.isConnected,
    isConnecting: instance.isConnecting
  };
}

/**
 * Set Socket.IO server
 */
export function setSocketIOServer(io) {
  ioServer = io;
  console.log(`✅ Socket.IO server configurado no BaileysInstanceService`);
}

export { baileysInstances };
