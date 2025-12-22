import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";
import cors from "cors";
import P from "pino";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: "*" } });

/* ================== ESTADO GLOBAL ================== */
let sock = null;
let isConnecting = false;
let isConnected = false;
let qrCodeData = null;
let connectionLock = false;
const AUTH_FOLDER = "./auth";
const PROCESSADOS_FILE = './processados.json';

let processados = { adicionados: [], linkEnviado: [] };
let lastConfig = {};
let numbers = [];
let cycleStatus = {
  isRunning: false,
  currentCycle: 0,
  processedInCycle: 0,
  nextCycleAt: undefined
};
let cicloTimeout = null;

/* ================== HELPERS (DO SCRIPT FUNCIONAL) ================== */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Essa é a função mágica do seu script que garante que o número está limpo
function normalizeNumber(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const s = String(value).replace(/[^0-9]/g, '');
  // descartar linhas muito curtas (menos de 8 dígitos é inválido)
  if (s.length < 8) return null;
  return s;
}

function stripJid(value) {
  if (!value) return value;
  return String(value).split('@')[0].split(':')[0];
}

async function botIsAdmin(sock, groupId) {
  try {
    const meta = await sock.groupMetadata(groupId);
    const participants = meta?.participants || [];
    const myNumber = stripJid(sock?.user?.id);
    const myLid = sock?.user?.lid ? stripJid(sock.user.lid) : null;

    const me = participants.find(p => {
      const pId = stripJid(p.id);
      return pId === myNumber || (myLid && pId === myLid);
    });

    if (!me) return false;
    return me.admin === 'admin' || me.admin === 'superadmin';
  } catch (e) {
    return false;
  }
}

/* ================== PERSISTÊNCIA ================== */
async function loadProcessados() {
  try {
    if (fs.existsSync(PROCESSADOS_FILE)) {
      const content = await fs.promises.readFile(PROCESSADOS_FILE, 'utf8');
      const parsed = JSON.parse(content);
      return {
        adicionados: Array.isArray(parsed.adicionados) ? parsed.adicionados.map(stripJid) : [],
        linkEnviado: Array.isArray(parsed.linkEnviado) ? parsed.linkEnviado.map(stripJid) : []
      };
    }
  } catch (e) { console.error('Erro ao carregar processados:', e); }
  return { adicionados: [], linkEnviado: [] };
}

async function salvarProcessados(proc) {
  try {
    await fs.promises.writeFile(PROCESSADOS_FILE, JSON.stringify(proc, null, 2), 'utf8');
  } catch (e) { console.error('Erro ao salvar processados:', e); }
}

loadProcessados().then(p => { processados = p; });

/* ================== WHATSAPP LÓGICA ================== */
async function listarGrupos() {
  if (!sock || !isConnected) return [];
  try {
    const gruposMap = await sock.groupFetchAllParticipating();
    return Object.values(gruposMap).map(g => ({ id: g.id, nome: g.subject, membros: g.size }));
  } catch (e) { return []; }
}

async function ciclo(sock) {
  if (!sock || !cycleStatus.isRunning) return;

  const ADD_POR_CICLO = Number(lastConfig.addPerCycle || 8);
  let GROUP_ID = lastConfig.groupId;
  
  // Correção de segurança para o ID do Grupo
  if (GROUP_ID && !GROUP_ID.endsWith('@g.us')) {
     GROUP_ID = `${GROUP_ID}@g.us`;
  }
  
  if (!GROUP_ID) {
    console.log("❌ Erro: Nenhum grupo selecionado.");
    cycleStatus.isRunning = false;
    emitStatus();
    return;
  }

  // Filtra pendentes limpando o número antes de comparar
  const pendentes = numbers.filter(n => {
    const numLimpo = normalizeNumber(n.number);
    if (!numLimpo) return false;
    return !processados.adicionados.includes(numLimpo) &&
           !processados.linkEnviado.includes(numLimpo);
  });

  if (!pendentes.length) {
    console.log('🎉 Todos os números processados ou inválidos.');
    reagendarCiclo(sock);
    return;
  }

  const paraAdicionar = pendentes.slice(0, ADD_POR_CICLO);

  for (const item of paraAdicionar) {
    if (!cycleStatus.isRunning) break;
    
    // AQUI ESTÁ A CORREÇÃO: Usar a normalização exata do seu script funcional
    const numeroLimpo = normalizeNumber(item.number);
    if (!numeroLimpo) {
        console.log(`⚠️ Pulei número inválido: ${item.number}`);
        continue;
    }

    try {
      const isAdmin = await botIsAdmin(sock, GROUP_ID);
      if (!isAdmin) {
        console.log('⛔ Bot não é admin do grupo selecionado. Parando ciclo.');
        cycleStatus.isRunning = false;
        emitStatus();
        return;
      }

      // Constrói o JID exatamente como no seu script funcional
      const jid = `${numeroLimpo}@s.whatsapp.net`;
      
      console.log(`🚀 Tentando adicionar: ${jid} no grupo ${GROUP_ID}`);

      const response = await sock.groupParticipantsUpdate(GROUP_ID, [jid], 'add');
      console.log(`✅ Resultado Baileys:`, response);
      
      // Se chegou aqui sem erro no catch, consideramos sucesso na tentativa
      processados.adicionados.push(numeroLimpo);
      
      // Atualiza status visual na lista
      const idx = numbers.findIndex(n => normalizeNumber(n.number) === numeroLimpo);
      if (idx >= 0) numbers[idx].status = 'added';
      
      console.log(`✅ ${numeroLimpo} adicionado à lista de processados.`);

    } catch (err) {
      console.log(`❌ Falha no número ${numeroLimpo}:`, err?.message || err);
      // Aqui você pode decidir se manda o link (igual ao seu script)
      processados.linkEnviado.push(numeroLimpo);
      const idx = numbers.findIndex(n => normalizeNumber(n.number) === numeroLimpo);
      if (idx >= 0) numbers[idx].status = 'failed';
    }

    await salvarProcessados(processados);
    emitStatus();
    
    // Delay aleatório igual ao seu script
    const tempoEspera = random(60000, 120000); 
    console.log(`⏳ Aguardando ${tempoEspera/1000}s...`);
    await delay(tempoEspera);
  }

  reagendarCiclo(sock);
}

function reagendarCiclo(sock) {
  if (cycleStatus.isRunning) {
    const ms = Number(lastConfig.cycleMinutes || 35) * 60_000;
    clearTimeout(cicloTimeout);
    cicloTimeout = setTimeout(() => ciclo(sock), ms);
    cycleStatus.nextCycleAt = new Date(Date.now() + ms);
    console.log(`⏰ Próximo ciclo agendado para: ${cycleStatus.nextCycleAt.toLocaleTimeString()}`);
    emitStatus();
  }
}

function getStatus(extra = {}) {
  return {
    status: isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected',
    qrCode: qrCodeData,
    cycleStatus: {
        ...cycleStatus,
        nextCycleAt: cycleStatus.nextCycleAt ? cycleStatus.nextCycleAt.toISOString() : null
    },
    numbers,
    ...extra
  };
}

function emitStatus(extra = {}) {
  io.emit('status', getStatus(extra));
}

async function destroySocket() {
  if (sock) {
    sock.ev.removeAllListeners();
    try { sock.end(); } catch {}
  }
  sock = null;
  qrCodeData = null;
}

/* ================== CONEXÃO WHATSAPP ================== */
async function startBot() {
  if (connectionLock) return;
  connectionLock = true;
  isConnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      auth: state,
      version,
      logger: P({ level: 'silent' }),
      browser: ['Chrome','Windows','10'],
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000, // Timeout aumentado para evitar quedas
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCodeData = await qrcode.toDataURL(qr);
        emitStatus();
      }

      if (connection === 'open') {
        isConnected = true;
        isConnecting = false;
        connectionLock = false;
        qrCodeData = null;
        console.log('✅ WhatsApp Conectado!');
        emitStatus();
        
        const grupos = await listarGrupos();
        emitStatus({ groups: grupos });

        if (cycleStatus.isRunning) ciclo(sock);
      }

      if (connection === 'close') {
        isConnected = false;
        isConnecting = false;
        connectionLock = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        console.log(`Reconectando: ${shouldReconnect}`);
        await destroySocket();
        if (shouldReconnect) setTimeout(startBot, 5000);
      }
    });
  } catch (e) {
    connectionLock = false;
    isConnecting = false;
    setTimeout(startBot, 5000);
  }
}

/* ================== SOCKET & API ================== */
io.on("connection", (socket) => {
  socket.emit('status', getStatus());
  socket.on("connect-whatsapp", startBot);
});

app.post('/upload-numbers', (req, res) => {
  const { newNumbers } = req.body;
  if (Array.isArray(newNumbers)) {
    // Apenas carregamos, a validação forte acontece na hora do ciclo
    numbers = newNumbers.map((num, i) => ({ 
      id: `num-${Date.now()}-${i}`, 
      number: String(num), // Mantém string original, normaliza depois
      status: 'pending' 
    }));
    emitStatus();
    return res.json({ success: true });
  }
  res.status(400).send();
});

app.post('/set-group', (req, res) => {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ success: false });
    
    lastConfig.groupId = groupId;
    console.log('✅ Grupo selecionado manualmente:', groupId);
    emitStatus({ selectedGroup: groupId });
    res.json({ success: true, groupId });
  });

app.post('/start-cycle', (req, res) => {
  try {
    const { config: incomingConfig } = req.body || {};
    lastConfig = { ...lastConfig, ...incomingConfig };

    if (!lastConfig.groupId) {
      return res.status(400).json({ success: false, message: 'Nenhum grupo selecionado!' });
    }

    cycleStatus.isRunning = true;
    cycleStatus.currentCycle = (cycleStatus.currentCycle || 0) + 1;
    cycleStatus.nextCycleAt = new Date(Date.now() + (Number(lastConfig.cycleMinutes) || 35) * 60_000);

    res.json({ 
      success: true, 
      cycleStatus: {
        ...cycleStatus,
        nextCycleAt: cycleStatus.nextCycleAt.toISOString()
      } 
    });

    if (isConnected && sock) {
      // Inicia imediatamente
      ciclo(sock).catch(e => console.error("Erro no ciclo:", e));
    }
    emitStatus();
  } catch (e) {
    console.error("Erro start-cycle:", e);
    if (!res.headersSent) res.status(500).json({ success: false });
  }
});

app.post('/pause-cycle', (req, res) => {
  cycleStatus.isRunning = false;
  clearTimeout(cicloTimeout);
  console.log('⏸️ Ciclo pausado pelo usuário.');
  emitStatus();
  res.json({ success: true });
});

app.get('/groups', async (req, res) => {
  const grupos = await listarGrupos();
  res.json({ success: true, grupos });
});

// Retornar os contatos que estão no arquivo processados.json (para o CRM)
app.get('/crm/contacts', async (req, res) => {
  try {
    const proc = await loadProcessados();
    const contacts = proc.adicionados.map((num, index) => ({
      id: String(index),
      name: `Cliente ${num}`,
      phone: num,
      status: "customer",
      tags: ["adicionado-direto"],
      lastContact: new Date().toISOString().split('T')[0]
    }));
    res.json(contacts);
  } catch (e) {
    console.error('Erro ao servir /crm/contacts', e);
    res.status(500).json({ error: 'Erro ao ler contatos' });
  }
});

// Rota para enviar uma mensagem individual do CRM via Baileys
app.post('/crm/send-message', async (req, res) => {
  const { phone, message } = req.body || {};
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
  if (!sock || !isConnected) return res.status(400).json({ error: 'WhatsApp desconectado' });

  try {
    const jid = `${String(phone).replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    res.json({ success: true });
  } catch (e) {
    console.error('Erro ao enviar mensagem CRM:', e);
    res.status(500).json({ error: e?.message || 'Erro ao enviar mensagem' });
  }
});

server.listen(3001, () => console.log("🚀 Backend rodando na porta 3001"));