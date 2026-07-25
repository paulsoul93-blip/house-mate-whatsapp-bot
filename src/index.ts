import express from 'express';
import qrcode from 'qrcode-terminal';
import { config } from './config';
import { QueueService } from './services/queueService';
import { WhatsAppBotClient } from './bot/client';
import { setupScheduler } from './bot/scheduler';

async function main() {
  console.log('🚀 Starting House Mate App WhatsApp Bot...');

  // Initialize Queue Service
  const queueService = new QueueService(config.stateFile, config.dutyMembers);
  console.log(`[Main] Current Duty: ${queueService.getCurrentDuty()}`);

  // Initialize WhatsApp Bot Client
  const botClient = new WhatsAppBotClient(config, queueService);

  // Setup Sunday 19:00 Cron Scheduler
  setupScheduler(
    () => botClient.getSocket(),
    () => botClient.getGroupId(),
    queueService,
    config
  );

  // Start WhatsApp Connection
  await botClient.start();

  // Initialize Status & Healthcheck Express HTTP server
  const app = express();

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/status', async (req, res) => {
    const isConnected = botClient.getIsConnected();
    const currentDuty = queueService.getCurrentDuty();
    const nextDuty = queueService.getNextDuty();
    const members = queueService.getMembers();
    const qrPending = !!botClient.getQR();
    const groupId = await botClient.getGroupId();

    res.json({
      botName: 'House Mate App WhatsApp Bot',
      connected: isConnected,
      qrPending,
      targetGroup: config.groupName,
      targetGroupId: groupId || 'Not found yet',
      schedule: config.scheduleCron,
      timezone: config.scheduleTimezone,
      queue: {
        members,
        currentDuty,
        nextDuty,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/qr', (req, res) => {
    const qr = botClient.getQR();
    if (!qr) {
      if (botClient.getIsConnected()) {
        res.send('<h3>✅ WhatsApp client is connected! No QR scan needed.</h3>');
      } else {
        res.send('<h3>⏳ Connecting to WhatsApp... QR code not generated yet. Refresh in a few seconds.</h3>');
      }
      return;
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>House Mate Bot - WhatsApp QR Code</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; text-align: center; padding: 2rem; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; display: inline-block; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #38bdf8; margin-bottom: 0.5rem; }
            p { color: #94a3b8; }
            img { margin-top: 1rem; border-radius: 8px; background: white; padding: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>House Mate WhatsApp Bot</h1>
            <p>Zeskanuj ponizszy kod QR w WhatsApp -> Polaczone urzadzenia</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
              qr
            )}" alt="WhatsApp QR Code" />
            <p style="margin-top: 1rem; font-size: 0.9rem;">Strona odswieza sie automatycznie co 10 sekund</p>
          </div>
          <script>setTimeout(() => location.reload(), 10000);</script>
        </body>
      </html>
    `);
  });

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`🌐 HTTP status server running on http://0.0.0.0:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Fatal error in main process:', err);
  process.exit(1);
});
