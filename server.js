import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import { MongoClient, ObjectId } from 'mongodb';
import fs from "fs";
import path from "path";
import cors from "cors";
import P from "pino";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { contextMiddleware } from './middleware/context.js';
import { auditMiddleware } from './middleware/audit.js';
import { requestLoggingMiddleware, errorLoggingMiddleware } from './src/middleware/logging.js';
import { securityHeaders, corsOptions, globalLimiter } from './src/middleware/security.js';

const app = express();

// Security
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(globalLimiter);

// Logging
app.use(requestLoggingMiddleware);
app.use(express.json());

// Context middleware - safe for all routes (public and protected)
app.use(contextMiddleware);

// Audit middleware will be applied per-route (not globally)
// to avoid logging public routes

// JWT config
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret_in_production';

async function findUserByEmail(email) {
  if (!db) return null;
  try { return await db.collection('users').findOne({ email }); } catch (e) { return null; }
}

async function createUser({ email, password, clientId, name }) {
  const hash = await bcrypt.hash(String(password), 10);
  const doc = { email, password: hash, clientId: clientId || 'default', name: name || null, createdAt: new Date() };
  if (db) {
    const r = await db.collection('users').insertOne(doc);
    doc._id = r.insertedId;
  }
  return doc;
}

// Legacy authenticateJWT - DEPRECATED: Use middleware/auth.js authenticateJWT instead
// This is kept for backward compatibility with legacy routes
function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    
    // Extract companyId (new system) or clientId (legacy system)
    req.companyId = payload.companyId || null;
    req.clientId = payload.clientId || payload.companyId || null; // Fallback to companyId for legacy
    req.userId = payload.userId || payload.user_id || payload.id || null;
    req.role = payload.role || null;
    
    return next();
  } catch (e) {
    console.error('[Legacy authenticateJWT] Token validation error:', e.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Helper middleware to require that a clientId is available from the token
function requireClient(req, res, next) {
  const clientId = req.clientId || (req.user && req.user.clientId) || null;
  if (!clientId) return res.status(403).json({ error: 'clientId missing in token' });
  // Ensure clientId comes only from token; remove any clientId sent in body/query
  try { delete req.body.clientId; } catch (e) {}
  try { delete req.query.clientId; } catch (e) {}
  req.clientId = clientId;
  return next();
}

const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: "*" } });

// Make io available globally for routes
global.io = io;

/* ================== MONGODB SETUP ================== */
// Optional hardcoded URI (can be overridden by environment variables)
const MONGO_URI = "mongodb+srv://senhorpv1234_db_user:j9fKaROVb6XPKHot@cluster0.grzbazf.mongodb.net/saas_whatsapp?retryWrites=true&w=majority";
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || null;
let db = null;
async function initMongo() {
  const uri = MONGO_URI || MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set. MongoDB persistence disabled.');
    return;
  }
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    console.log('✅ Connected to MongoDB');
  } catch (e) {
    console.error('Erro conectando ao MongoDB:', e);
  }
}

// Extract phone number from JID
function extractPhoneFromJid(jid) {
  if (!jid) return null;
  return String(jid).split('@')[0].replace(/[^0-9]/g, '');
}

// Save message to MongoDB with complete structure
async function saveMessageToMongo(clientId, jid, message) {
  if (!db) return;
  try {
    const phone = extractPhoneFromJid(jid);
    if (!phone) return;

    const messageDoc = {
      clientId,
      contactPhone: phone,
      jid,
      direction: message.side === 'out' ? 'out' : 'in',
      messageType: message.messageType || 'text',
      content: message.text || '',
      status: message.status || 'delivered',
      createdAt: new Date(message.timestamp || Date.now()),
      // Keep legacy fields for compatibility
      side: message.side,
      text: message.text,
      timestamp: new Date(message.timestamp || Date.now())
    };

    await db.collection('messages').insertOne(messageDoc);
  } catch (e) { 
    console.error('Erro salvar mensagem no MongoDB', e); 
  }
}

// Upsert contact when message is received/sent
async function upsertContact(clientId, jid, messageData = {}) {
  if (!db) return;
  try {
    const phone = extractPhoneFromJid(jid);
    if (!phone) return;

    const now = new Date();
    const lastMessageAt = messageData.timestamp ? new Date(messageData.timestamp) : now;

    await db.collection('contacts').updateOne(
      { clientId, phone },
      {
        $set: {
          lastMessageAt,
          isActive: true,
          updatedAt: now
        },
        $setOnInsert: {
          clientId,
          phone,
          name: messageData.name || `Contato ${phone}`,
          tags: messageData.tags || [],
          createdAt: now
        }
      },
      { upsert: true }
    );
  } catch (e) {
    console.error('Erro upsertContact', e);
  }
}

async function getMessagesFromMongo(clientId, jid) {
  if (!db) return [];
  try {
    const msgs = await db.collection('messages').find({ clientId, jid }).sort({ timestamp: 1 }).toArray();
    return msgs;
  } catch (e) { console.error('Erro buscar mensagens no MongoDB', e); return []; }
}

// ================== PROCESSED NUMBERS & AUTOMATIONS (Mongo) ==================
async function checkProcessed(clientId, number) {
  if (!db) return false;
  try {
    const doc = await db.collection('processed_numbers').findOne({ clientId, number });
    return !!doc;
  } catch (e) { console.error('Erro checkProcessed', e); return false; }
}

async function markProcessed(clientId, number, status, groupId) {
  if (!db) return;
  try {
    await db.collection('processed_numbers').updateOne(
      { clientId, number },
      { $set: { status, groupId, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  } catch (e) { console.error('Erro markProcessed', e); }
}

async function handleAutomations(clientId, jid, incomingText, sock) {
  if (!db || !incomingText || !jid) return;
  try {
    const automations = await db.collection('automations').find({ clientId, isActive: true }).toArray();
    for (const auto of automations) {
      try {
        if (!auto.trigger) continue;
        if (incomingText.toLowerCase().includes(String(auto.trigger).toLowerCase())) {
          await sock.sendMessage(jid, { text: auto.response });
          const autoMsg = { side: 'out', text: auto.response, timestamp: new Date().toISOString() };
          await saveMessageToMongo(clientId, jid, autoMsg);
          await upsertContact(clientId, jid, autoMsg);
          break;
        }
      } catch (e) { console.error('Erro executar automação', e); }
    }
  } catch (e) { console.error('Erro handleAutomations', e); }
}

/* ================== ESTADO GLOBAL ================== */
let sock = null;
let isConnecting = false;
let isConnected = false;
let qrCodeData = null;
let connectionLock = false;
const AUTH_FOLDER = "./auth";
const PROCESSADOS_FILE = './processados.json';
const CHAT_HISTORY_FILE = './chat_histories.json';
const AUTOMATIONS_FILE = './automations.json'; // <--- NOVO

/* ================== MULTI-INSTANCE (SaaS) ================== */
// Key: clientId, Value: { sock, state... }
const instances = new Map();

async function createInstance(clientId) {
  if (instances.has(clientId)) return instances.get(clientId);

  const authPath = path.join(AUTH_FOLDER, `client_${clientId}`);
  await fs.promises.mkdir(authPath, { recursive: true });

  const PROCESS_FILE_CLIENT = `./processados_${clientId}.json`;
  const CHAT_FILE_CLIENT = `./chat_histories_${clientId}.json`;

  async function loadProc() {
    try {
      if (fs.existsSync(PROCESS_FILE_CLIENT)) {
        const content = await fs.promises.readFile(PROCESS_FILE_CLIENT, 'utf8');
        const parsed = JSON.parse(content);
        return {
          adicionados: Array.isArray(parsed.adicionados) ? parsed.adicionados.map(stripJid) : [],
          linkEnviado: Array.isArray(parsed.linkEnviado) ? parsed.linkEnviado.map(stripJid) : []
        };
      }
    } catch (e) { console.error('Erro ao carregar processados (client):', e); }
    return { adicionados: [], linkEnviado: [] };
  }

  async function loadChats() {
    try {
      if (fs.existsSync(CHAT_FILE_CLIENT)) {
        const content = await fs.promises.readFile(CHAT_FILE_CLIENT, 'utf8');
        const parsed = JSON.parse(content) || {};
        return parsed;
      }
    } catch (e) { console.error('Erro ao carregar chat histories (client):', e); }
    return {};
  }

  const processadosClient = await loadProc();
  const chatHistoriesClient = await loadChats();

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: P({ level: 'silent' }),
    browser: ['Chrome','Windows','10'],
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
  });

  sock.ev.on('creds.update', saveCreds);

  const instance = {
    clientId,
    sock,
    isConnecting: false,
    isConnected: false,
    qrCodeData: null,
    connectionLock: false,
    PROCESS_FILE_CLIENT,
    CHAT_FILE_CLIENT,
    processados: processadosClient,
    chatHistories: chatHistoriesClient,
    lastConfig: {},
    numbers: [],
    cycleStatus: {
      isRunning: false,
      currentCycle: 0,
      processedInCycle: 0,
      nextCycleAt: undefined
    },
    cicloTimeout: null,
    autoCloseTimeout: null,
    lastActivity: Date.now()
  };

  // helpers to persist
  async function saveProcLocal() {
    try { await fs.promises.writeFile(PROCESS_FILE_CLIENT, JSON.stringify(instance.processados, null, 2), 'utf8'); } catch (e) { console.error('Erro salvar proc client', e); }
  }
  async function saveChatsLocal() {
    try { await fs.promises.writeFile(CHAT_FILE_CLIENT, JSON.stringify(instance.chatHistories, null, 2), 'utf8'); } catch (e) { console.error('Erro salvar chats client', e); }
  }

  // Auto-close (inactivity) management
  const INACTIVITY_MS = 2 * 60 * 60 * 1000; // 2 hours
  function scheduleAutoClose() {
    try { clearTimeout(instance.autoCloseTimeout); } catch (e) {}
    instance.lastActivity = Date.now();
    instance.autoCloseTimeout = setTimeout(async () => {
      console.log(`Auto-closing instance ${clientId} due to inactivity.`);
      try { await destroyInstance(clientId); } catch (e) { console.error(e); }
    }, INACTIVITY_MS);
  }
  scheduleAutoClose();
  instance.scheduleAutoClose = scheduleAutoClose;

  // connection handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      instance.qrCodeData = await qrcode.toDataURL(qr);
      instance.isConnecting = true;
      // Emit to client-specific room
      io.to(String(clientId)).emit('status', { 
        clientId, 
        status: 'connecting', 
        qrCode: instance.qrCodeData 
      });
      // Also emit 'qr' event for compatibility
      io.to(String(clientId)).emit('qr', instance.qrCodeData);
    }

    if (connection === 'open') {
      instance.isConnected = true;
      instance.isConnecting = false;
      instance.connectionLock = false;
      instance.qrCodeData = null;
      console.log(`✅ WhatsApp Conectado (client ${clientId})`);
      // Emit to client-specific room
      io.to(String(clientId)).emit('status', { 
        clientId, 
        status: 'connected' 
      });
      // Also emit 'connected' event for compatibility
      io.to(String(clientId)).emit('connected');
      
      // Fetch and emit groups list
      try {
        const gruposMap = await sock.groupFetchAllParticipating();
        const grupos = Object.values(gruposMap).map(g => ({ 
          id: g.id, 
          nome: g.subject, 
          membros: g.size 
        }));
        emitInstanceStatus(clientId, { groups: grupos });
      } catch (e) {
        console.error('Erro ao buscar grupos:', e);
      }
    }

    if (connection === 'close') {
      instance.isConnected = false;
      instance.isConnecting = false;
      instance.connectionLock = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`Reconectando (client ${clientId}): ${shouldReconnect}`);
      // Emit disconnected status
      io.to(String(clientId)).emit('status', { 
        clientId, 
        status: 'disconnected' 
      });
      try { sock.end(); } catch (e) {}
      if (shouldReconnect) setTimeout(() => createInstance(clientId), 5000);
    }
  });

  // messages handler (minimal)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      if (type !== 'notify') return;
      const msg = messages && messages[0];
      if (!msg || !msg.message) return;

      const jid = msg.key.remoteJid || (msg.key?.participant ? msg.key.participant : null);
      if (!jid) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      if (!instance.chatHistories[jid]) instance.chatHistories[jid] = { status: 'bot', lastInteraction: null, messages: [] };

      const now = new Date().toISOString();
      const newMessage = { side: msg.key.fromMe ? 'out' : 'in', text, timestamp: now };

      instance.chatHistories[jid].messages.push(newMessage);
      instance.chatHistories[jid].lastInteraction = now;
      await saveChatsLocal();

      // persist to Mongo
      await saveMessageToMongo(clientId, jid, newMessage);
      
      // Upsert contact (create or update lastMessageAt, isActive)
      await upsertContact(clientId, jid, newMessage);

      // Handover: Transbordo Humano (multi-instance)
      if (!msg.key.fromMe && typeof text === 'string') {
        const t = text.toLowerCase().trim();
        if (t === 'atendente' || t === 'ajuda') {
          instance.chatHistories[jid].status = 'human';
          instance.chatHistories[jid].lastInteraction = now;
          await saveChatsLocal();
          io.to(String(clientId)).emit('handover', { clientId, jid, status: 'human' });

          const botNotice = { side: 'out', text: 'Encaminhei sua conversa para um atendente humano. Aguarde um instante.', timestamp: new Date().toISOString() };
          instance.chatHistories[jid].messages.push(botNotice);
          await saveChatsLocal();
          io.to(String(clientId)).emit('new-message', { clientId, jid, message: botNotice, meta: { status: 'human' } });
          
          // Try to send the message
          try {
            await sock.sendMessage(jid, { text: botNotice.text });
          } catch (e) {
            console.error('Erro ao enviar mensagem de handover:', e);
          }
          
          return;
        }
      }

      if (instance.chatHistories[jid].status === 'human') {
        // If status is human, just emit the message and don't process automations
        try { io.to(String(clientId)).emit('new-message', { clientId, jid, message: newMessage, meta: { status: instance.chatHistories[jid].status } }); } catch (e) {}
        scheduleAutoClose();
        return;
      }

      // Try automations for this instance
      try { await handleAutomations(clientId, jid, text, sock); } catch (e) { console.error('Erro automacao instance', e); }

      // emit only to subscribed clients (room = clientId)
      try { io.to(String(clientId)).emit('new-message', { clientId, jid, message: newMessage, meta: { status: instance.chatHistories[jid].status } }); } catch (e) {}

      // refresh auto-close
      scheduleAutoClose();
    } catch (e) {
      console.error('Erro messages.upsert (client):', e);
    }
  });

  instances.set(clientId, instance);
  return instance;
}

async function destroyInstance(clientId) {
  const inst = instances.get(clientId);
  if (!inst) return;
  try {
    inst.sock.ev.removeAllListeners();
    try { inst.sock.end(); } catch (e) {}
  } catch (e) {}
  instances.delete(clientId);
}

// Get status for a specific instance
function getInstanceStatus(clientId, extra = {}) {
  const inst = instances.get(clientId);
  if (!inst) {
    return {
      status: 'disconnected',
      qrCode: null,
      cycleStatus: {
        isRunning: false,
        currentCycle: 0,
        processedInCycle: 0,
        nextCycleAt: null
      },
      numbers: [],
      ...extra
    };
  }

  return {
    status: inst.isConnected ? 'connected' : inst.isConnecting ? 'connecting' : 'disconnected',
    qrCode: inst.qrCodeData,
    cycleStatus: {
      ...inst.cycleStatus,
      nextCycleAt: inst.cycleStatus.nextCycleAt ? inst.cycleStatus.nextCycleAt.toISOString() : null
    },
    numbers: inst.numbers || [],
    ...extra
  };
}

// Emit status to specific client room
function emitInstanceStatus(clientId, extra = {}) {
  const status = getInstanceStatus(clientId, extra);
  io.to(String(clientId)).emit('status', status);
}

let processados = { adicionados: [], linkEnviado: [] };
let chatHistories = {};
let lastConfig = {};
let numbers = [];
let cycleStatus = {
  isRunning: false,
  currentCycle: 0,
  processedInCycle: 0,
  nextCycleAt: undefined
};
let cicloTimeout = null;

/* ================== HELPERS ================== */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function normalizeNumber(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const s = String(value).replace(/[^0-9]/g, '');
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

/* ================== LÓGICA DE MÉTRICAS (NOVO) ================== */
function calculateMetrics() {
    const allJids = Object.keys(chatHistories);
    const total = allJids.length;
    let engaged = 0;
    const responseTimes = [];
    const messagesPerDay = {};
  
    allJids.forEach(jid => {
      const data = chatHistories[jid];
      // Garante que é array ou pega a prop messages
      const messages = Array.isArray(data) ? data : (data.messages || []);
      
      // Engajamento: se o cliente mandou mensagem ('in')
      if (messages.some(m => m.side === 'in')) engaged++;
  
      // Cálculo de tempo de resposta
      for (let i = 0; i < messages.length - 1; i++) {
          if (messages[i].side === 'in' && messages[i+1].side === 'out') {
              const t1 = new Date(messages[i].timestamp).getTime();
              const t2 = new Date(messages[i+1].timestamp).getTime();
              const diff = t2 - t1;
              if (diff > 0 && diff < 86400000) { 
                  responseTimes.push(diff);
              }
          }
          // Volume por dia
          const dateKey = new Date(messages[i].timestamp).toISOString().split('T')[0];
          messagesPerDay[dateKey] = (messagesPerDay[dateKey] || 0) + 1;
      }
    });
  
    const avgResponseMs = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
  
    return {
      total,
      engaged,
      retentionRate: total > 0 ? ((engaged / total) * 100).toFixed(1) : 0,
      avgResponseMs: Math.round(avgResponseMs),
      messagesPerDay
    };
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

async function loadChatHistories() {
  try {
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      const content = await fs.promises.readFile(CHAT_HISTORY_FILE, 'utf8');
      const parsed = JSON.parse(content);

      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach((jid) => {
          const val = parsed[jid];
          if (Array.isArray(val)) {
            const last = val.length ? (val[val.length - 1].timestamp || new Date().toISOString()) : null;
            parsed[jid] = { status: 'bot', lastInteraction: last, messages: val };
          } else if (val && Array.isArray(val.messages)) {
            // ok
          } else if (!val) {
            parsed[jid] = { status: 'bot', lastInteraction: null, messages: [] };
          }
        });
      }
      return parsed;
    }
  } catch (e) { console.error('Erro ao carregar chat histories:', e); }
  return {};
}

async function saveChatHistories() {
  try {
    await fs.promises.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistories, null, 2), 'utf8');
  } catch (e) { console.error('Erro ao salvar chat histories:', e); }
}

loadProcessados().then(p => { processados = p; });
loadChatHistories().then(h => { chatHistories = h || {}; });

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
  
  if (GROUP_ID && !GROUP_ID.endsWith('@g.us')) {
     GROUP_ID = `${GROUP_ID}@g.us`;
  }
  
  if (!GROUP_ID) {
    console.log("❌ Erro: Nenhum grupo selecionado.");
    cycleStatus.isRunning = false;
    emitStatus();
    return;
  }

  const pendentes = numbers.filter(n => {
    const numLimpo = normalizeNumber(n.number);
    if (!numLimpo) return false;
    return true; // we'll filter using DB below
  });

  if (!pendentes.length) {
    console.log('🎉 Todos os números processados ou inválidos.');
    reagendarCiclo(sock);
    return;
  }

  const paraAdicionar = pendentes.slice(0, ADD_POR_CICLO);

  // filter out already processed in DB
  const clientIdForCycle = lastConfig.clientId || 'default';
  const toAddFiltered = [];
  for (const item of paraAdicionar) {
    const numLimpo = normalizeNumber(item.number);
    if (!numLimpo) continue;
    const already = await checkProcessed(clientIdForCycle, numLimpo);
    if (!already) toAddFiltered.push(item);
  }

  const paraAdicionarFinal = toAddFiltered;

  for (const item of paraAdicionarFinal) {
    if (!cycleStatus.isRunning) break;
    
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

      const jid = `${numeroLimpo}@s.whatsapp.net`;
      console.log(`🚀 Tentando adicionar: ${jid} no grupo ${GROUP_ID}`);

      const response = await sock.groupParticipantsUpdate(GROUP_ID, [jid], 'add');
      console.log(`✅ Resultado Baileys:`, response);
      
      // mark as processed in DB
      try { await markProcessed(clientIdForCycle, numeroLimpo, 'adicionado', GROUP_ID); } catch (e) {}

      // keep legacy in-memory
      processados.adicionados.push(numeroLimpo);
      
      const idx = numbers.findIndex(n => normalizeNumber(n.number) === numeroLimpo);
      if (idx >= 0) numbers[idx].status = 'added';
      
      console.log(`✅ ${numeroLimpo} adicionado à lista de processados.`);

    } catch (err) {
      console.log(`❌ Falha no número ${numeroLimpo}:`, err?.message || err);
      processados.linkEnviado.push(numeroLimpo);
      try { await markProcessed(clientIdForCycle, numeroLimpo, 'linkEnviado', GROUP_ID); } catch (e) {}
      const idx = numbers.findIndex(n => normalizeNumber(n.number) === numeroLimpo);
      if (idx >= 0) numbers[idx].status = 'failed';
    }

    await salvarProcessados(processados);
    // also optionally emit processed change
    emitStatus();
    
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
      defaultQueryTimeoutMs: 60_000,
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

    // ================== HANDLER DE MENSAGENS (ATUALIZADO) ==================
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      try {
        if (type !== 'notify') return;
        const msg = messages && messages[0];
        if (!msg || !msg.message) return;

        const jid = msg.key.remoteJid || (msg.key?.participant ? msg.key.participant : null);
        if (!jid) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Inicializa estrutura
        if (!chatHistories[jid]) chatHistories[jid] = { status: 'bot', lastInteraction: null, messages: [] };

        const now = new Date().toISOString();
        const newMessage = {
          side: msg.key.fromMe ? 'out' : 'in',
          text,
          timestamp: now
        };

        chatHistories[jid].messages.push(newMessage);
        chatHistories[jid].lastInteraction = now;
        await saveChatHistories();

        // persist to Mongo (global/default client)
        try { 
          const clientIdForMessage = lastConfig.clientId || 'default'; 
          await saveMessageToMongo(clientIdForMessage, jid, newMessage);
          await upsertContact(clientIdForMessage, jid, newMessage);
        } catch (e) { 
          console.error('Erro ao salvar mensagem/contato (legacy):', e);
        }

        io.emit('new-message', { jid, message: newMessage, meta: { status: chatHistories[jid].status } });

        // Handover: Transbordo Humano (legacy single-instance - deprecated)
        if (!msg.key.fromMe && typeof text === 'string') {
          const t = text.toLowerCase().trim();
          if (t === 'atendente' || t === 'ajuda') {
            chatHistories[jid].status = 'human';
            chatHistories[jid].lastInteraction = now;
            await saveChatHistories();
            io.emit('handover', { jid, status: 'human' });

            const botNotice = { side: 'out', text: 'Encaminhei sua conversa para um atendente humano. Aguarde um instante.', timestamp: new Date().toISOString() };
            chatHistories[jid].messages.push(botNotice);
            await saveChatHistories();
            io.emit('new-message', { jid, message: botNotice, meta: { status: 'human' } });
            return;
          }
        }

        if (chatHistories[jid].status === 'human') return;

        // ================== AUTOMAÇÕES (MongoDB) ==================
        if (!msg.key.fromMe && typeof text === 'string') {
          try {
            const clientIdForMessage = lastConfig.clientId || 'default';
            await handleAutomations(clientIdForMessage, jid, text, sock);
          } catch (errAuto) {
            console.error('Erro automação (mongo):', errAuto);
          }
        }

      } catch (e) {
        console.error('Erro em messages.upsert handler:', e);
      }
    });
  } catch (e) {
    connectionLock = false;
    isConnecting = false;
    setTimeout(startBot, 5000);
  }
}

/* ================== SOCKET & API ================== */

// ==== MULTI-TENANT AUTH ROUTES ====
// Note: Routes are loaded via dynamic import on server start
// If routes fail to load, legacy endpoints will still work
(async () => {
  try {
    const authModule = await import('./routes/auth.js');
    const companyModule = await import('./routes/companies.js');
    const userModule = await import('./routes/users.js');
    const connectionsModule = await import('./routes/connections.js');
    const campaignsModule = await import('./routes/campaigns.js');
    const contactsModule = await import('./routes/contacts.js');
    const conversationsModule = await import('./routes/conversations.js');
    const dashboardModule = await import('./routes/dashboard.js');
    const adminModule = await import('./routes/admin.js');
    
    // PHASE 2 CRM Advanced Features
    const pipelineRoutes = await import('./routes/pipelines.js');
    const leadScoringRoutes = await import('./routes/lead-scoring.js');
    const customFieldsRoutes = await import('./routes/custom-fields.js');
    const segmentsRoutes = await import('./routes/segments.js');
    
    // PHASE 3 Intelligent Automations
    const automationRoutes = await import('./routes/automations.js');
    
    // PHASE 4 Integrations
    const integrationsRoutes = await import('./routes/integrations.js');
    
    app.use('/auth', authModule.default);
    app.use('/companies', companyModule.default);
    app.use('/users', userModule.default);
    app.use('/connections', connectionsModule.default);
    app.use('/campaigns', campaignsModule.default);
    app.use('/contacts', contactsModule.default);
    app.use('/conversations', conversationsModule.default);
    app.use('/dashboard', dashboardModule.default);
    app.use('/admin', adminModule.default);
    
    // Register PHASE 2 routes
    app.use('/api', pipelineRoutes.default);
    app.use('/api', leadScoringRoutes.default);
    app.use('/api', customFieldsRoutes.default);
    app.use('/api', segmentsRoutes.default);
    
    // Register PHASE 3 routes
    app.use('/api', automationRoutes.default);
    
    // Register PHASE 4 routes
    app.use('/api/integrations', integrationsRoutes.default);
    
    // Initialize Socket.IO in routes
    if (pipelineRoutes.setSocketIO) {
      pipelineRoutes.setSocketIO(io);
    }
    if (leadScoringRoutes.setSocketIO) {
      leadScoringRoutes.setSocketIO(io);
    }
    if (segmentsRoutes.setSocketIO) {
      segmentsRoutes.setSocketIO(io);
    }
    if (customFieldsRoutes.setSocketIO) {
      customFieldsRoutes.setSocketIO(io);
    }
    
    // Initialize connections routes with Socket.IO
    if (connectionsModule.initializeConnectionsRoutes) {
      connectionsModule.initializeConnectionsRoutes(io);
    }
    
    console.log('✅ Multi-tenant routes loaded');
    console.log('✅ PHASE 2 CRM Advanced Features loaded (Pipelines, Lead Scoring, Custom Fields, Segments)');
    console.log('✅ PHASE 3 Intelligent Automations loaded (Workflow Builder, AI Integration)');
  } catch (error) {
    console.error('⚠️  Failed to load multi-tenant routes:', error.message);
    console.log('⚠️  Legacy auth endpoints will be used');
    console.log('⚠️  Make sure PostgreSQL is configured and migrations are run');
  }
})();

// ==== START WORKERS ====
// Start workers in background (only if not in test mode)
if (process.env.NODE_ENV !== 'test' && !process.env.SKIP_WORKERS) {
  (async () => {
    try {
      const workersManager = await import('./workers/index.js');
      await workersManager.default.start();
      console.log('✅ Workers started');
    } catch (error) {
      console.error('⚠️  Failed to start workers:', error.message);
      console.log('⚠️  Workers will not be available');
      console.log('⚠️  To disable workers, set SKIP_WORKERS=true');
      console.log('⚠️  To use workers, make sure Redis is running on port 6379');
    }
  })();
}

// ==== LEGACY AUTH (DEPRECATED - use /auth/* routes) ====
// Keep for backward compatibility during migration
app.post('/auth/register/legacy', async (req, res) => {
  try {
    const { email, password, clientId, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const existing = await findUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'user already exists' });
    const user = await createUser({ email, password, clientId, name });
    const token = jwt.sign({ userId: String(user._id), email: user.email, clientId: user.clientId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
    res.json({ success: true, token, user: { email: user.email, clientId: user.clientId, name: user.name } });
  } catch (e) {
    console.error('Erro register:', e);
    res.status(500).json({ error: 'erro' });
  }
});

app.post('/auth/login/legacy', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    const ok = await bcrypt.compare(String(password), String(user.password));
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ userId: String(user._id), email: user.email, clientId: user.clientId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
    res.json({ success: true, token, user: { email: user.email, clientId: user.clientId, name: user.name } });
  } catch (e) {
    console.error('Erro login:', e);
    res.status(500).json({ error: 'erro' });
  }
});
// Socket auth: verify token on handshake and auto-join room for the client
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(); // allow anonymous sockets for legacy usage
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.clientId = decoded.clientId || null;
    return next();
  } catch (e) {
    return next();
  }
});

io.on("connection", (socket) => {
  // If the token provided a clientId, auto-join that room
  const clientId = socket.clientId;
  try {
    if (clientId) {
      socket.join(String(clientId));
      // Send current status for this client's instance
      const status = getInstanceStatus(clientId);
      socket.emit('status', status);
    }
  } catch (e) {}

  // Handle get-status request - return status for the client's instance
  socket.on('get-status', () => {
    if (clientId) {
      const status = getInstanceStatus(clientId);
      socket.emit('status', status);
    } else {
      socket.emit('status', { status: 'disconnected' });
    }
  });

  // Legacy: connect-whatsapp for single-instance mode (deprecated, use REST endpoint)
  socket.on("connect-whatsapp", () => {
    if (clientId) {
      // Use REST endpoint logic via createInstance
      createInstance(clientId).catch(e => {
        console.error('Erro ao criar instância via socket:', e);
      });
    } else {
      startBot();
    }
  });

  // Frontend may still emit a subscribe with clientId. Prefer token-based join.
  socket.on('subscribe', (subClientId) => {
    try { 
      socket.join(String(subClientId));
      const status = getInstanceStatus(subClientId);
      socket.emit('status', status);
    } catch (e) {}
  });

  // Subscribe to company connections updates
  socket.on('subscribe-company-connections', (companyId) => {
    try {
      socket.join(`company_${companyId}`);
      console.log(`Socket joined company room: company_${companyId}`);
    } catch (e) {
      console.error('Error subscribing to company connections:', e);
    }
  });

  // Subscribe to specific connection updates
  socket.on('subscribe-connection', (connectionId) => {
    try {
      socket.join(`connection_${connectionId}`);
      console.log(`Socket joined connection room: connection_${connectionId}`);
    } catch (e) {
      console.error('Error subscribing to connection:', e);
    }
  });
});

// ================== MULTI-CLIENT ROUTES ==================
app.post('/clients/:clientId/connect', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  if (!clientId) return res.status(400).json({ error: 'clientId required' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });
  try {
    const inst = await createInstance(clientId);
    // Emit initial status via socket
    emitInstanceStatus(clientId);
    return res.json({ success: true, clientId, qr: inst.qrCodeData });
  } catch (e) {
    console.error('Erro criar instância:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/clients', authenticateJWT, (req, res) => {
  try {
    if (req.user && req.user.clientId) return res.json({ clients: [String(req.user.clientId)] });
    const list = Array.from(instances.keys());
    res.json({ clients: list });
  } catch (e) { res.status(500).json({ error: 'erro' }); }
});

app.post('/upload-numbers', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const { newNumbers } = req.body;
  if (!Array.isArray(newNumbers)) {
    return res.status(400).json({ error: 'newNumbers must be an array' });
  }
  
  const inst = instances.get(clientId);
  if (!inst) {
    return res.status(400).json({ error: 'Instance not found. Connect WhatsApp first.' });
  }

  inst.numbers = newNumbers.map((num, i) => ({ 
    id: `num-${Date.now()}-${i}`, 
    number: String(num), 
    status: 'pending' 
  }));
  
  emitInstanceStatus(clientId);
  res.json({ success: true });
});

app.post('/set-group', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const { groupId } = req.body;
  if (!groupId) return res.status(400).json({ success: false, error: 'groupId required' });
  
  const inst = instances.get(clientId);
  if (!inst) {
    return res.status(400).json({ error: 'Instance not found. Connect WhatsApp first.' });
  }
  
  inst.lastConfig.groupId = groupId;
  console.log(`✅ Grupo selecionado manualmente (client ${clientId}):`, groupId);
  emitInstanceStatus(clientId, { selectedGroup: groupId });
  res.json({ success: true, groupId });
});

// Multi-instance cycle functions
async function cicloInstance(clientId) {
  const inst = instances.get(clientId);
  if (!inst || !inst.isConnected || !inst.cycleStatus.isRunning) return;

  const ADD_POR_CICLO = Number(inst.lastConfig.addPerCycle || 8);
  let GROUP_ID = inst.lastConfig.groupId;
  
  if (GROUP_ID && !GROUP_ID.endsWith('@g.us')) {
    GROUP_ID = `${GROUP_ID}@g.us`;
  }
  
  if (!GROUP_ID) {
    console.log(`❌ Erro: Nenhum grupo selecionado (client ${clientId}).`);
    inst.cycleStatus.isRunning = false;
    emitInstanceStatus(clientId);
    return;
  }

  const pendentes = inst.numbers.filter(n => {
    const numLimpo = normalizeNumber(n.number);
    return numLimpo !== null;
  });

  if (!pendentes.length) {
    console.log(`🎉 Todos os números processados ou inválidos (client ${clientId}).`);
    reagendarCicloInstance(clientId);
    return;
  }

  const paraAdicionar = pendentes.slice(0, ADD_POR_CICLO);

  // Filter out already processed in DB
  const toAddFiltered = [];
  for (const item of paraAdicionar) {
    const numLimpo = normalizeNumber(item.number);
    if (!numLimpo) continue;
    const already = await checkProcessed(clientId, numLimpo);
    if (!already) toAddFiltered.push(item);
  }

  for (const item of toAddFiltered) {
    if (!inst.cycleStatus.isRunning) break;
    
    const numeroLimpo = normalizeNumber(item.number);
    if (!numeroLimpo) {
      console.log(`⚠️ Pulei número inválido: ${item.number}`);
      continue;
    }

    try {
      const isAdmin = await botIsAdmin(inst.sock, GROUP_ID);
      if (!isAdmin) {
        console.log(`⛔ Bot não é admin do grupo selecionado (client ${clientId}). Parando ciclo.`);
        inst.cycleStatus.isRunning = false;
        emitInstanceStatus(clientId);
        return;
      }

      const jid = `${numeroLimpo}@s.whatsapp.net`;
      console.log(`🚀 Tentando adicionar: ${jid} no grupo ${GROUP_ID} (client ${clientId})`);

      await inst.sock.groupParticipantsUpdate(GROUP_ID, [jid], 'add');
      
      // Mark as processed in DB
      try { await markProcessed(clientId, numeroLimpo, 'adicionado', GROUP_ID); } catch (e) {}

      // Update instance state
      inst.processados.adicionados.push(numeroLimpo);
      const idx = inst.numbers.findIndex(n => normalizeNumber(n.number) === numeroLimpo);
      if (idx >= 0) inst.numbers[idx].status = 'added';
      inst.cycleStatus.processedInCycle++;

      console.log(`✅ ${numeroLimpo} adicionado à lista de processados (client ${clientId}).`);

    } catch (err) {
      console.log(`❌ Falha no número ${numeroLimpo} (client ${clientId}):`, err?.message || err);
      inst.processados.linkEnviado.push(numeroLimpo);
      try { await markProcessed(clientId, numeroLimpo, 'linkEnviado', GROUP_ID); } catch (e) {}
      const idx = inst.numbers.findIndex(n => normalizeNumber(n.number) === numeroLimpo);
      if (idx >= 0) inst.numbers[idx].status = 'failed';
    }

    // Save processados locally
    try {
      await fs.promises.writeFile(inst.PROCESS_FILE_CLIENT, JSON.stringify(inst.processados, null, 2), 'utf8');
    } catch (e) { console.error('Erro salvar proc client', e); }
    
    emitInstanceStatus(clientId);
    
    const tempoEspera = random(60000, 120000); 
    console.log(`⏳ Aguardando ${tempoEspera/1000}s...`);
    await delay(tempoEspera);
  }

  reagendarCicloInstance(clientId);
}

function reagendarCicloInstance(clientId) {
  const inst = instances.get(clientId);
  if (!inst || !inst.cycleStatus.isRunning) return;

  const ms = Number(inst.lastConfig.cycleMinutes || 35) * 60_000;
  try { clearTimeout(inst.cicloTimeout); } catch (e) {}
  inst.cicloTimeout = setTimeout(() => cicloInstance(clientId), ms);
  inst.cycleStatus.nextCycleAt = new Date(Date.now() + ms);
  console.log(`⏰ Próximo ciclo agendado para (client ${clientId}): ${inst.cycleStatus.nextCycleAt.toLocaleTimeString()}`);
  emitInstanceStatus(clientId);
}

app.post('/start-cycle', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  try {
    const { config: incomingConfig } = req.body || {};
    
    const inst = instances.get(clientId);
    if (!inst) {
      return res.status(400).json({ success: false, error: 'Instance not found. Connect WhatsApp first.' });
    }

    inst.lastConfig = { ...inst.lastConfig, ...incomingConfig };

    if (!inst.lastConfig.groupId) {
      return res.status(400).json({ success: false, message: 'Nenhum grupo selecionado!' });
    }

    inst.cycleStatus.isRunning = true;
    inst.cycleStatus.currentCycle = (inst.cycleStatus.currentCycle || 0) + 1;
    inst.cycleStatus.processedInCycle = 0;
    inst.cycleStatus.nextCycleAt = new Date(Date.now() + (Number(inst.lastConfig.cycleMinutes) || 35) * 60_000);

    res.json({ 
      success: true, 
      cycleStatus: {
        ...inst.cycleStatus,
        nextCycleAt: inst.cycleStatus.nextCycleAt.toISOString()
      } 
    });

    if (inst.isConnected && inst.sock) {
      cicloInstance(clientId).catch(e => console.error(`Erro no ciclo (client ${clientId}):`, e));
    }
    emitInstanceStatus(clientId);
  } catch (e) {
    console.error("Erro start-cycle:", e);
    if (!res.headersSent) res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/pause-cycle', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const inst = instances.get(clientId);
  if (!inst) {
    return res.status(400).json({ error: 'Instance not found. Connect WhatsApp first.' });
  }

  inst.cycleStatus.isRunning = false;
  try { clearTimeout(inst.cicloTimeout); } catch (e) {}
  console.log(`⏸️ Ciclo pausado pelo usuário (client ${clientId}).`);
  emitInstanceStatus(clientId);
  res.json({ success: true });
});

// Multi-client groups endpoint
async function listarGruposInstance(clientId) {
  const inst = instances.get(clientId);
  if (!inst || !inst.isConnected) return [];
  try {
    const gruposMap = await inst.sock.groupFetchAllParticipating();
    return Object.values(gruposMap).map(g => ({ id: g.id, nome: g.subject, membros: g.size }));
  } catch (e) { 
    console.error('Erro ao listar grupos:', e);
    return []; 
  }
}

app.get('/groups', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  try {
    const grupos = await listarGruposInstance(clientId);
    res.json({ success: true, grupos });
  } catch (e) {
    console.error('Erro ao buscar grupos:', e);
    res.status(500).json({ success: false, error: 'Erro ao buscar grupos' });
  }
});

// Legacy endpoint (deprecated, use authenticated version)
app.get('/groups/legacy', async (req, res) => {
  const grupos = await listarGrupos();
  res.json({ success: true, grupos });
});

app.get('/crm/contacts', async (req, res) => {
  try {
    const proc = await loadProcessados();
    // Mescla processados com informações do histórico se houver
    const contacts = proc.adicionados.map((num, index) => {
        const jid = `${num}@s.whatsapp.net`;
        const history = chatHistories[jid];
        
        return {
            id: String(index),
            name: `Cliente ${num}`,
            phone: num,
            status: history ? (history.status === 'human' ? 'inactive' : 'customer') : "customer",
            tags: history && history.status === 'human' ? ["atendimento-humano"] : ["adicionado-direto"],
            lastContact: history ? history.lastInteraction : new Date().toISOString().split('T')[0]
        };
    });
    res.json(contacts);
  } catch (e) {
    console.error('Erro ao servir /crm/contacts', e);
    res.status(500).json({ error: 'Erro ao ler contatos' });
  }
});

// ================== ROTA SEND-MESSAGE (SINGLE-INSTANCE - legacy) ==================
app.post('/crm/send-message', async (req, res) => {
  const { phone, message } = req.body || {};
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
  if (!sock || !isConnected) return res.status(400).json({ error: 'WhatsApp desconectado' });

  try {
    const jid = `${String(phone).replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });

    if (!chatHistories[jid]) chatHistories[jid] = { status: 'human', messages: [] };
    if (Array.isArray(chatHistories[jid])) {
      chatHistories[jid] = { status: 'human', messages: chatHistories[jid] };
    }

    const newMsg = { side: 'out', text: message, timestamp: new Date().toISOString() };
    chatHistories[jid].messages.push(newMsg);
    chatHistories[jid].lastInteraction = new Date().toISOString();
    chatHistories[jid].status = 'human';

    await saveChatHistories();
    res.json({ success: true });
  } catch (e) {
    console.error('Erro ao enviar mensagem CRM:', e);
    res.status(500).json({ error: e?.message || 'Erro ao enviar mensagem' });
  }
});

// ================== ROTA SEND-MESSAGE (MULTI-CLIENT) ==================
// TODO: remover rotas legacy /crm/:clientId/* — usar somente rotas autenticadas sem clientId na URL
app.post('/crm/:clientId/send-message', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  const { phone, message } = req.body || {};
  if (!clientId) return res.status(400).json({ error: 'clientId required' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });

  const inst = instances.get(clientId);
  if (!inst) return res.status(400).json({ error: 'Instance not found. Call /clients/:clientId/connect first.' });
  if (!inst.isConnected) return res.status(400).json({ error: 'WhatsApp desconectado for this client' });

  try {
    const jid = `${String(phone).replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await inst.sock.sendMessage(jid, { text: message });

    if (!inst.chatHistories[jid]) inst.chatHistories[jid] = { status: 'human', messages: [] };
    if (Array.isArray(inst.chatHistories[jid])) inst.chatHistories[jid] = { status: 'human', messages: inst.chatHistories[jid] };

    const newMsg = { side: 'out', text: message, timestamp: new Date().toISOString() };
    inst.chatHistories[jid].messages.push(newMsg);
    inst.chatHistories[jid].lastInteraction = new Date().toISOString();
    inst.chatHistories[jid].status = 'human';
    // persist client chat file
    try { await fs.promises.writeFile(inst.CHAT_FILE_CLIENT, JSON.stringify(inst.chatHistories, null, 2), 'utf8'); } catch (e) { console.error('Erro salvar chat client', e); }

    // persist to Mongo
    await saveMessageToMongo(clientId, jid, newMsg);
    await upsertContact(clientId, jid, newMsg);

    // emit to room
    try { io.to(String(clientId)).emit('new-message', { clientId, jid, message: newMsg, meta: { status: inst.chatHistories[jid].status } }); } catch (e) {}

    // refresh auto-close
    try { if (typeof inst.scheduleAutoClose === 'function') inst.scheduleAutoClose(); } catch (e) {}

    res.json({ success: true });
  } catch (e) {
    console.error('Erro ao enviar mensagem CRM (client):', e);
    res.status(500).json({ error: e?.message || 'Erro ao enviar mensagem' });
  }
});

// GET messages for client (prefer MongoDB)
app.get('/crm/:clientId/messages/:phone', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  const phone = String(req.params.phone || '').replace(/[^0-9]/g, '');
  if (!clientId) return res.status(400).json({ error: 'clientId required' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });
  const jid = `${phone}@s.whatsapp.net`;
  try {
    if (db) {
      const msgs = await getMessagesFromMongo(clientId, jid);
      return res.json(msgs);
    }
    const inst = instances.get(clientId);
    if (inst && inst.chatHistories[jid]) {
      return res.json(inst.chatHistories[jid].messages || []);
    }
    return res.json([]);
  } catch (e) {
    console.error('Erro buscar mensagens client:', e);
    res.status(500).json({ error: 'erro' });
  }
});

// ================== ANALYTICS ENDPOINTS ==================
// Get message analytics by date range (REAL DATA from MongoDB)
app.get('/analytics/messages', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const { range = '7d' } = req.query;
  
  if (!db) return res.json({ messagesIn: [], messagesOut: [], byDate: {} });

  try {
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '90d') {
      startDate.setDate(now.getDate() - 90);
    } else {
      startDate.setDate(now.getDate() - 7); // default to 7 days
    }

    // Aggregate messages by date and direction
    const pipeline = [
      {
        $match: {
          clientId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            direction: '$direction'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ];

    const results = await db.collection('messages').aggregate(pipeline).toArray();

    // Format results
    const byDate = {};
    let totalIn = 0;
    let totalOut = 0;

    results.forEach(item => {
      const date = item._id.date;
      const direction = item._id.direction;
      const count = item.count;

      if (!byDate[date]) {
        byDate[date] = { date, messagesIn: 0, messagesOut: 0 };
      }

      if (direction === 'in') {
        byDate[date].messagesIn = count;
        totalIn += count;
      } else {
        byDate[date].messagesOut = count;
        totalOut += count;
      }
    });

    // Convert to array format for charts
    const byDateArray = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      totalIn,
      totalOut,
      byDate: byDateArray,
      range
    });
  } catch (e) {
    console.error('Erro ao buscar analytics:', e);
    res.status(500).json({ error: 'Erro ao buscar analytics' });
  }
});

// Legacy metrics endpoint (deprecated, use /analytics/messages)
app.get('/metrics', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  if (!db) return res.json({ total: 0, engaged: 0, retentionRate: 0, avgResponseMs: 0, messagesPerDay: {} });

  try {
    // Get total contacts
    const totalContacts = await db.collection('contacts').countDocuments({ clientId });
    
    // Get active contacts (last message in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const engagedContacts = await db.collection('contacts').countDocuments({
      clientId,
      lastMessageAt: { $gte: thirtyDaysAgo },
      isActive: true
    });

    // Calculate retention rate
    const retentionRate = totalContacts > 0 ? ((engagedContacts / totalContacts) * 100).toFixed(1) : '0';

    // Get messages per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const messagesPerDayPipeline = [
      {
        $match: {
          clientId,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      }
    ];

    const messagesPerDayResults = await db.collection('messages').aggregate(messagesPerDayPipeline).toArray();
    const messagesPerDay = {};
    messagesPerDayResults.forEach(item => {
      messagesPerDay[item._id] = item.count;
    });

    res.json({
      total: totalContacts,
      engaged: engagedContacts,
      retentionRate,
      avgResponseMs: 0, // TODO: Calculate from messages
      messagesPerDay
    });
  } catch (e) {
    console.error('Erro ao calcular métricas:', e);
    res.status(500).json({ error: 'Erro ao calcular métricas' });
  }
});

app.get('/crm/messages/:phone', (req, res) => {
  const phone = String(req.params.phone || '').replace(/[^0-9]/g, '');
  const jid = `${phone}@s.whatsapp.net`;
  const chat = chatHistories[jid];
  // Retorna apenas o array de mensagens, garantindo compatibilidade
  if (chat) {
      if (Array.isArray(chat)) return res.json(chat); // Legado
      if (Array.isArray(chat.messages)) return res.json(chat.messages);
  }
  res.json([]);
});

// Error logging middleware (deve estar antes de initMongo)
// app.use(errorLoggingMiddleware);

// Initialize Mongo (if configured) then start server
initMongo().then(() => {
  server.listen(3001, () => console.log("🚀 Backend rodando na porta 3001"));
}).catch((e) => {
  console.error('Erro init:', e);
  server.listen(3001, () => console.log("🚀 Backend rodando na porta 3001 (Mongo init failed)"));
});

// ================== AUTOMATIONS CRUD (Mongo) ==================
app.get('/crm/:clientId/automations', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  if (!clientId) return res.status(400).json({ error: 'clientId required' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });
  try {
    if (!db) return res.json([]);
    const autos = await db.collection('automations').find({ clientId }).toArray();
    res.json(autos);
  } catch (e) { console.error('Erro fetch automations', e); res.status(500).json({ error: 'erro' }); }
});

app.post('/crm/:clientId/automations', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  const { trigger, response, isActive = true, type = 'message' } = req.body || {};
  if (!clientId || !trigger) return res.status(400).json({ error: 'clientId and trigger required' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });
  try {
    const doc = { clientId, trigger, response: response || '', isActive: Boolean(isActive), type, createdAt: new Date(), updatedAt: new Date() };
    if (db) {
      const r = await db.collection('automations').insertOne(doc);
      res.json({ success: true, insertedId: r.insertedId });
    } else {
      res.status(500).json({ error: 'Mongo not configured' });
    }
  } catch (e) { console.error('Erro create automation', e); res.status(500).json({ error: 'erro' }); }
});

app.put('/crm/:clientId/automations/:id', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  const id = String(req.params.id || '');
  const payload = req.body || {};
  if (!db) return res.status(500).json({ error: 'Mongo not configured' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });
  try {
    await db.collection('automations').updateOne({ _id: new ObjectId(id), clientId }, { $set: { ...payload, updatedAt: new Date() } });
    res.json({ success: true });
  } catch (e) { console.error('Erro update automation', e); res.status(500).json({ error: 'erro' }); }
});

app.delete('/crm/:clientId/automations/:id', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  const id = String(req.params.id || '');
  if (!db) return res.status(500).json({ error: 'Mongo not configured' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });
  try {
    await db.collection('automations').deleteOne({ _id: new ObjectId(id), clientId });
    res.json({ success: true });
  } catch (e) { console.error('Erro delete automation', e); res.status(500).json({ error: 'erro' }); }
});

// Optional: import existing automations.json into Mongo for a client
app.post('/crm/:clientId/import-automations', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  if (!clientId) return res.status(400).json({ error: 'clientId required' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });
  try {
    if (!fs.existsSync(AUTOMATIONS_FILE)) return res.status(404).json({ error: 'automations file not found' });
    const content = JSON.parse(fs.readFileSync(AUTOMATIONS_FILE, 'utf8')) || [];
    if (!db) return res.status(500).json({ error: 'Mongo not configured' });
    const toInsert = content.map(a => ({ clientId, trigger: a.trigger || a.name || '', response: a.response || (a.steps && a.steps[0] && a.steps[0].content) || '', isActive: a.isActive !== false, type: a.type || 'message', createdAt: new Date(), updatedAt: new Date() }));
    if (toInsert.length) await db.collection('automations').insertMany(toInsert);
    res.json({ success: true, inserted: toInsert.length });
  } catch (e) { console.error('Erro import automations', e); res.status(500).json({ error: 'erro' }); }
});

// Multi-tenant contacts endpoint (safer — returns [] when no Mongo)
app.get('/crm/:clientId/contacts', authenticateJWT, async (req, res) => {
  const clientId = String(req.params.clientId || '');
  if (!clientId) return res.status(400).json({ error: 'clientId required' });
  if (req.user && req.user.clientId && String(req.user.clientId) !== clientId) return res.status(403).json({ error: 'forbidden' });

  if (!db) {
    console.warn('⚠️ Tentativa de buscar contatos sem MongoDB');
    return res.json([]);
  }

  try {
    const processed = await db.collection('processed_numbers').find({ clientId }).toArray();
    const contacts = await Promise.all(processed.map(async (p, idx) => {
      const number = p.number;
      const jid = `${number}@s.whatsapp.net`;
      const lastMsg = await db.collection('messages').find({ clientId, jid }).sort({ timestamp: -1 }).limit(1).toArray();
      return {
        id: String(p._id || idx),
        name: `Cliente ${number}`,
        phone: number,
        status: p.status === 'linkEnviado' ? 'inactive' : 'customer',
        tags: p.status === 'linkEnviado' ? ['link-enviado'] : ['adicionado'],
        lastContact: lastMsg && lastMsg[0] ? lastMsg[0].timestamp : (p.updatedAt ? p.updatedAt.toISOString().split('T')[0] : null)
      };
    }));

    res.json(contacts);
  } catch (e) {
    console.error('Erro ao buscar contatos por clientId', e);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

// Rota para criar/atualizar contatos manualmente (Útil para testes e integrações)
app.post('/crm/:clientId/contacts', async (req, res) => {
  const clientId = String(req.params.clientId || '');
  const { jid, name, status } = req.body || {};

  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });

  try {
    if (!jid) return res.status(400).json({ error: 'jid required' });

    await db.collection('processed_numbers').updateOne(
      { clientId, number: String(String(jid).split('@')[0]) },
      {
        $set: {
          clientId,
          number: String(String(jid).split('@')[0]),
          name: name || null,
          status: status || 'Aguardando',
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    // also ensure a minimal contact doc in a dedicated contacts collection (optional)
    try {
      await db.collection('contacts').updateOne(
        { clientId, jid },
        { $set: { name: name || null, status: status || 'Aguardando', updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (e) { /* non-fatal */ }

    res.json({ success: true, message: 'Contato salvo com sucesso!' });
  } catch (e) {
    console.error('Erro salvar contato manual:', e);
    res.status(500).json({ error: e.message });
  }
});

// --- Authenticated endpoints that derive clientId from JWT (SaaS-safe) ---
// Get contacts for the authenticated user's client - REAL DATA from MongoDB
app.get('/crm/contacts', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  if (!db) return res.json([]);
  try {
    // Get contacts from contacts collection, ordered by lastMessageAt DESC
    const contacts = await db.collection('contacts')
      .find({ clientId })
      .sort({ lastMessageAt: -1 })
      .toArray();

    const formattedContacts = contacts.map((c) => {
      // Determine status based on isActive and lastMessageAt (active if message in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isRecentlyActive = c.lastMessageAt && new Date(c.lastMessageAt) > thirtyDaysAgo;
      
      return {
        id: String(c._id),
        name: c.name || `Contato ${c.phone}`,
        phone: c.phone,
        status: (c.isActive && isRecentlyActive) ? 'customer' : 'inactive',
        tags: c.tags || [],
        lastContact: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString().split('T')[0] : null
      };
    });

    res.json(formattedContacts);
  } catch (e) {
    console.error('Erro ao buscar contatos (auth):', e);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

// Create/update contact using client from JWT
app.post('/crm/contacts', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const { jid, name, status } = req.body || {};
  if (!db) return res.status(500).json({ error: 'Banco de dados não conectado' });
  try {
    if (!jid) return res.status(400).json({ error: 'jid required' });
    await db.collection('processed_numbers').updateOne(
      { clientId, number: String(String(jid).split('@')[0]) },
      { $set: { clientId, number: String(String(jid).split('@')[0]), name: name || null, status: status || 'Aguardando', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    try {
      await db.collection('contacts').updateOne(
        { clientId, jid },
        { $set: { name: name || null, status: status || 'Aguardando', updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (e) {}
    res.json({ success: true, message: 'Contato salvo com sucesso!' });
  } catch (e) {
    console.error('Erro salvar contato manual (auth):', e);
    res.status(500).json({ error: e.message });
  }
});

// Send message for authenticated client's instance
app.post('/crm/send-message', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const { phone, message } = req.body || {};
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
  // find instance for this client
  const inst = instances.get(clientId);
  if (!inst) return res.status(400).json({ error: 'Instance not found. Call /clients/:clientId/connect first.' });
  if (!inst.isConnected) return res.status(400).json({ error: 'WhatsApp desconectado for this client' });
  try {
    const jid = `${String(phone).replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await inst.sock.sendMessage(jid, { text: message });
    if (!inst.chatHistories[jid]) inst.chatHistories[jid] = { status: 'human', messages: [] };
    if (Array.isArray(inst.chatHistories[jid])) inst.chatHistories[jid] = { status: 'human', messages: inst.chatHistories[jid] };
    const newMsg = { side: 'out', text: message, timestamp: new Date().toISOString() };
    inst.chatHistories[jid].messages.push(newMsg);
    inst.chatHistories[jid].lastInteraction = new Date().toISOString();
    inst.chatHistories[jid].status = 'human';
    try { await fs.promises.writeFile(inst.CHAT_FILE_CLIENT, JSON.stringify(inst.chatHistories, null, 2), 'utf8'); } catch (e) { console.error('Erro salvar chat client', e); }
    await saveMessageToMongo(clientId, jid, newMsg);
    await upsertContact(clientId, jid, newMsg);
    try { io.to(String(clientId)).emit('new-message', { clientId, jid, message: newMsg, meta: { status: inst.chatHistories[jid].status } }); } catch (e) {}
    try { if (typeof inst.scheduleAutoClose === 'function') inst.scheduleAutoClose(); } catch (e) {}
    res.json({ success: true });
  } catch (e) {
    console.error('Erro ao enviar mensagem CRM (auth):', e);
    res.status(500).json({ error: e?.message || 'Erro ao enviar mensagem' });
  }
});

// Get messages for authenticated client
app.get('/crm/messages/:phone', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const phone = String(req.params.phone || '').replace(/[^0-9]/g, '');
  const jid = `${phone}@s.whatsapp.net`;
  try {
    if (db) {
      const msgs = await getMessagesFromMongo(clientId, jid);
      return res.json(msgs);
    }
    const inst = instances.get(clientId);
    if (inst && inst.chatHistories[jid]) return res.json(inst.chatHistories[jid].messages || []);
    return res.json([]);
  } catch (e) {
    console.error('Erro buscar mensagens client (auth):', e);
    res.status(500).json({ error: 'erro' });
  }
});

// Automations CRUD using client from token
app.get('/crm/automations', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  try {
    if (!db) return res.json([]);
    const autos = await db.collection('automations').find({ clientId }).toArray();
    res.json(autos);
  } catch (e) { console.error('Erro fetch automations (auth)', e); res.status(500).json({ error: 'erro' }); }
});

app.post('/crm/automations', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const { trigger, response, isActive = true, type = 'message' } = req.body || {};
  if (!trigger) return res.status(400).json({ error: 'trigger required' });
  try {
    const doc = { clientId, trigger, response: response || '', isActive: Boolean(isActive), type, createdAt: new Date(), updatedAt: new Date() };
    if (db) {
      const r = await db.collection('automations').insertOne(doc);
      res.json({ success: true, insertedId: r.insertedId });
    } else {
      res.status(500).json({ error: 'Mongo not configured' });
    }
  } catch (e) { console.error('Erro create automation (auth)', e); res.status(500).json({ error: 'erro' }); }
});

app.put('/crm/automations/:id', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const id = String(req.params.id || '');
  const payload = req.body || {};
  if (!db) return res.status(500).json({ error: 'Mongo not configured' });
  try {
    await db.collection('automations').updateOne({ _id: new ObjectId(id), clientId }, { $set: { ...payload, updatedAt: new Date() } });
    res.json({ success: true });
  } catch (e) { console.error('Erro update automation (auth)', e); res.status(500).json({ error: 'erro' }); }
});

app.delete('/crm/automations/:id', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  const id = String(req.params.id || '');
  if (!db) return res.status(500).json({ error: 'Mongo not configured' });
  try {
    await db.collection('automations').deleteOne({ _id: new ObjectId(id), clientId });
    res.json({ success: true });
  } catch (e) { console.error('Erro delete automation (auth)', e); res.status(500).json({ error: 'erro' }); }
});

app.post('/crm/import-automations', authenticateJWT, requireClient, async (req, res) => {
  const clientId = String(req.clientId || '');
  try {
    if (!fs.existsSync(AUTOMATIONS_FILE)) return res.status(404).json({ error: 'automations file not found' });
    const content = JSON.parse(fs.readFileSync(AUTOMATIONS_FILE, 'utf8')) || [];
    if (!db) return res.status(500).json({ error: 'Mongo not configured' });
    const toInsert = content.map(a => ({ clientId, trigger: a.trigger || a.name || '', response: a.response || (a.steps && a.steps[0] && a.steps[0].content) || '', isActive: a.isActive !== false, type: a.type || 'message', createdAt: new Date(), updatedAt: new Date() }));
    if (toInsert.length) await db.collection('automations').insertMany(toInsert);
    res.json({ success: true, inserted: toInsert.length });
  } catch (e) { console.error('Erro import automations (auth)', e); res.status(500).json({ error: 'erro' }); }
});