import express from 'express';
import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let qrCodeData = null;
let isConnected = false;
let sock = null;
let cycleConfig = null;
let cycleStatus = { isRunning: false, currentCycle: 0, processedInCycle: 0 };
let numbers = [];

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        browser: ['Group Guru', 'Chrome', '1.0.0'],
    });

    sock.ev.on('connection.update', async (update) => {
        console.log('Connection update:', update);
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeData = await qrcode.toDataURL(qr);
            console.log('QR Code gerado:', qrCodeData.substring(0, 50) + '...');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;
            if (shouldReconnect) {
                console.log('Reconectando...');
                connectToWhatsApp();
            } else {
                console.log('Desconectado permanentemente');
                isConnected = false;
            }
        } else if (connection === 'open') {
            console.log('Conectado ao WhatsApp!');
            isConnected = true;
            qrCodeData = null;
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// connectToWhatsApp(); // Só conectar quando solicitado via API

app.get('/qr', (req, res) => {
    console.log('GET /qr - qrCodeData:', !!qrCodeData, 'isConnected:', isConnected);
    if (qrCodeData) {
        res.json({ qr: qrCodeData, connected: false });
    } else if (isConnected) {
        res.json({ qr: null, connected: true });
    } else {
        res.json({ qr: null, connected: false });
    }
});

app.post('/connect', (req, res) => {
    console.log('POST /connect - qrCodeData:', !!qrCodeData, 'isConnected:', isConnected);
    if (!qrCodeData && !isConnected) {
        connectToWhatsApp();
        res.json({ status: 'connecting' });
    } else {
        res.json({ status: 'already_connecting_or_connected' });
    }
});

app.post('/upload-numbers', (req, res) => {
    const { newNumbers } = req.body;
    numbers = newNumbers.map((num, index) => ({
        id: `num-${Date.now()}-${index}`,
        number: num,
        status: 'pending',
    }));
    console.log(`Uploaded ${numbers.length} numbers`);
    res.json({ success: true });
});

app.post('/start-cycle', async (req, res) => {
    if (!isConnected || !sock) {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    const { config } = req.body;
    cycleConfig = config;
    cycleStatus = {
        isRunning: true,
        currentCycle: 1,
        processedInCycle: 0,
        nextCycleAt: new Date(Date.now() + config.cycleMinutes * 60 * 1000),
    };
    console.log('Starting cycle with config:', config);

    // Simulate adding members
    const pendingNumbers = numbers.filter(n => n.status === 'pending').slice(0, config.addPerCycle);
    for (const num of pendingNumbers) {
        try {
            await sock.groupParticipantsUpdate(config.groupId, [{ id: num.number + '@s.whatsapp.net', action: 'add' }]);
            console.log(`Added ${num.number} to group ${config.groupId}`);
            num.status = 'added';
            cycleStatus.processedInCycle++;
        } catch (error) {
            console.error(`Failed to add ${num.number}:`, error);
            num.status = 'failed';
        }
    }

    res.json({ success: true, cycleStatus });
});

app.post('/pause-cycle', (req, res) => {
    cycleStatus.isRunning = false;
    cycleStatus.nextCycleAt = undefined;
    console.log('Cycle paused');
    res.json({ success: true });
});

app.post('/reset-cycle', (req, res) => {
    cycleStatus = {
        isRunning: false,
        currentCycle: 0,
        processedInCycle: 0,
    };
    console.log('Cycle reset');
    res.json({ success: true });
});

app.get('/status', (req, res) => {
    res.json({
        connection: { status: isConnected ? 'connected' : 'disconnected' },
        cycleStatus,
        numbers,
        stats: {
            total: numbers.length,
            added: numbers.filter(n => n.status === 'added').length,
            linkSent: numbers.filter(n => n.status === 'link_sent').length,
            failed: numbers.filter(n => n.status === 'failed').length,
        }
    });
});

app.listen(3001, () => {
    console.log('Servidor backend rodando na porta 3001');
});