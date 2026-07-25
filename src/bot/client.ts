import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  GroupMetadata,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import pino from 'pino';
import { AppConfig } from '../config';
import { QueueService } from '../services/queueService';
import { handleGroupMessage } from './handlers';

export class WhatsAppBotClient {
  private sock: WASocket | null = null;
  private config: AppConfig;
  private queueService: QueueService;
  private currentQR: string | null = null;
  private isConnected = false;
  private targetGroupId: string | null = null;

  constructor(config: AppConfig, queueService: QueueService) {
    this.config = config;
    this.queueService = queueService;
  }

  public getSocket(): WASocket | null {
    return this.sock;
  }

  public getQR(): string | null {
    return this.currentQR;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getTargetGroupId(): string | null {
    return this.targetGroupId;
  }

  public async getGroupId(): Promise<string | null> {
    if (this.targetGroupId) return this.targetGroupId;
    if (!this.sock || !this.isConnected) return null;

    try {
      const groups = await this.sock.groupFetchAllParticipating();
      for (const [id, metadata] of Object.entries(groups)) {
        if (
          metadata.subject.trim().toLowerCase() === this.config.groupName.trim().toLowerCase()
        ) {
          this.targetGroupId = id;
          console.log(`[WhatsAppClient] Found target group '${metadata.subject}' JID: ${id}`);
          return id;
        }
      }
      console.warn(
        `[WhatsAppClient] Target group '${this.config.groupName}' not found in active groups. Total groups: ${
          Object.keys(groups).length
        }`
      );
    } catch (err) {
      console.error('[WhatsAppClient] Error fetching groups:', err);
    }
    return null;
  }

  public async start(): Promise<void> {
    console.log('[WhatsAppClient] Starting WhatsApp Baileys client...');
    const { state, saveCreds } = await useMultiFileAuthState(this.config.authDir);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: ['House Mate Bot', 'Chrome', '1.0.0'],
    });

    this.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.currentQR = qr;
        console.log('\n=================== WHATSAPP SCAN QR CODE ===================');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('Zeskanuj powyższy kod QR w aplikacji WhatsApp -> Połączone urządzenia');
        console.log('=============================================================\n');
      }

      if (connection === 'close') {
        this.isConnected = false;
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        console.log(
          `[WhatsAppClient] Connection closed due to: ${lastDisconnect?.error}. Reconnecting: ${shouldReconnect}`
        );

        if (shouldReconnect) {
          setTimeout(() => this.start(), 3000);
        } else {
          console.error(
            '[WhatsAppClient] Logged out from WhatsApp Web. Session cleared. Please restart to scan new QR code.'
          );
        }
      } else if (connection === 'open') {
        this.isConnected = true;
        this.currentQR = null;
        console.log('✅ [WhatsAppClient] WhatsApp connection established successfully!');
        await this.getGroupId();
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          try {
            await handleGroupMessage(sock, msg, this.queueService);
          } catch (err) {
            console.error('[WhatsAppClient] Error handling message:', err);
          }
        }
      }
    });
  }
}
