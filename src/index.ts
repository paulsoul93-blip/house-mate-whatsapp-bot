import express from 'express';
import QRCode from 'qrcode';
import { WhatsAppBotClient } from './bot/client';
import { setupScheduler } from './bot/scheduler';
import { config } from './config';
import { BinCalendarService } from './services/binCalendarService';
import { CardRenderer } from './services/cardRenderer';
import { HouseMateMessenger } from './services/houseMateMessenger';
import { QueueService } from './services/queueService';
import { WelcomeStateService } from './services/welcomeStateService';

async function main(): Promise<void> {
  console.log('[Main] Starting House Mate WhatsApp Bot.');

  const queueService = new QueueService(
    config.stateFile,
    config.dutyMembers,
    {
      timeZone: config.scheduleTimezone,
    }
  );
  const binCalendarService = new BinCalendarService({
    calendarUrl: config.councilCalendarUrl,
    sourceUrl: config.councilSourceUrl,
    cacheFilePath: config.binCalendarCacheFile,
    cacheTtlMinutes: config.councilCacheTtlMinutes,
    timeZone: config.scheduleTimezone,
  });
  const cardRenderer = new CardRenderer();
  const welcomeStateService = new WelcomeStateService(
    config.welcomeStateFile
  );
  const messenger = new HouseMateMessenger(
    config,
    queueService,
    binCalendarService,
    cardRenderer,
    welcomeStateService
  );
  const botClient = new WhatsAppBotClient(
    config,
    queueService,
    messenger
  );

  console.log(`[Main] Current duty: ${queueService.getCurrentDuty()}`);

  setupScheduler(
    () => botClient.getSocket(),
    () => botClient.getGroupId(),
    queueService,
    messenger,
    config
  );

  await botClient.start();

  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/status', async (_request, response) => {
    const schedule = queueService.getDutySchedule();
    const groupId = await botClient.getGroupId();

    response.setHeader('Cache-Control', 'no-store');
    response.json({
      botName: 'House Mate WhatsApp Bot',
      connected: botClient.getIsConnected(),
      qrPending: Boolean(botClient.getQR()),
      targetGroup: config.groupName,
      targetGroupFound: Boolean(groupId),
      schedule: config.scheduleCron,
      timezone: config.scheduleTimezone,
      household: {
        address: config.houseAddress,
        postcode: config.housePostcode,
      },
      cleaning: {
        current: schedule.current,
        next: schedule.next,
        members: queueService.getMembers(),
      },
      councilSource: config.councilSourceUrl,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/qr', async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const qr = botClient.getQR();
    if (!qr) {
      response.type('html').send(
        renderQrPage(
          botClient.getIsConnected()
            ? 'WhatsApp is connected'
            : 'Connecting to WhatsApp',
          botClient.getIsConnected()
            ? 'No QR scan is required.'
            : 'A QR code has not been generated yet. This page will refresh automatically.'
        )
      );
      return;
    }

    try {
      const qrDataUrl = await QRCode.toDataURL(qr, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 420,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      });
      response.type('html').send(
        renderQrPage(
          'Connect WhatsApp',
          'Open WhatsApp, choose Linked devices, then scan this code.',
          qrDataUrl
        )
      );
    } catch (error) {
      console.error('[Main] Could not render QR code:', error);
      response.status(500).type('html').send(
        renderQrPage(
          'QR code unavailable',
          'Use the QR code displayed in the local bot console.'
        )
      );
    }
  });

  app.listen(config.port, config.httpHost, () => {
    console.log(
      `[Main] Status server: http://${config.httpHost}:${config.port}`
    );
  });
}

function renderQrPage(
  title: string,
  description: string,
  qrDataUrl?: string
): string {
  const qrMarkup = qrDataUrl
    ? `<div class="qr-frame"><img src="${qrDataUrl}" alt="WhatsApp connection QR code"></div>`
    : '<div class="status-dot" aria-hidden="true"></div>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="10">
    <title>House Mate Bot</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        color: #f8fafc;
        background:
          radial-gradient(circle at 20% 10%, rgba(14, 165, 233, .16), transparent 34%),
          radial-gradient(circle at 85% 90%, rgba(45, 212, 191, .1), transparent 32%),
          #020617;
      }
      main {
        width: min(100%, 560px);
        padding: clamp(28px, 7vw, 52px);
        border: 1px solid rgba(255, 255, 255, .1);
        border-radius: 28px;
        background: rgba(255, 255, 255, .055);
        box-shadow: 0 30px 90px rgba(0, 0, 0, .45);
        backdrop-filter: blur(20px);
      }
      .eyebrow {
        color: #38bdf8;
        font-size: 12px;
        font-weight: 750;
        letter-spacing: .18em;
        text-transform: uppercase;
      }
      h1 { margin: 14px 0 10px; font-size: clamp(34px, 8vw, 54px); line-height: 1.02; }
      p { margin: 0; color: #94a3b8; font-size: 17px; line-height: 1.6; }
      .qr-frame {
        margin-top: 30px;
        padding: 16px;
        border-radius: 22px;
        background: white;
      }
      img { display: block; width: 100%; height: auto; border-radius: 10px; }
      .status-dot {
        width: 72px;
        height: 72px;
        margin-top: 34px;
        border: 1px solid rgba(56, 189, 248, .45);
        border-radius: 24px;
        background: #38bdf8;
        box-shadow: 0 0 50px rgba(56, 189, 248, .45);
      }
      footer { margin-top: 28px; color: #64748b; font-size: 13px; }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">19 Silver Birch Close</div>
      <h1>${title}</h1>
      <p>${description}</p>
      ${qrMarkup}
      <footer>House Mate Bot · local connection page</footer>
    </main>
  </body>
</html>`;
}

main().catch((error: unknown) => {
  console.error('[Main] Fatal process error:', error);
  process.exit(1);
});
