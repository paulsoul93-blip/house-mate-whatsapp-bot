import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import type { proto, WASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import type { AppConfig } from '../config';
import { HouseMateMessenger } from '../services/houseMateMessenger';
import { QueueService } from '../services/queueService';
import { parseHouseCommand } from './commandParser';
import { handleGroupMessage } from './handlers';
import { extractCommandText } from './messageContent';
import {
  isTargetGroupMessage,
  shouldProcessMessageUpsert,
} from './messageScope';

const MAX_PROCESSED_MESSAGE_IDS = 500;

function getMessageTimestampMs(
  timestamp: proto.IWebMessageInfo['messageTimestamp']
): number | null {
  const timestampSeconds = Number(timestamp);
  return Number.isFinite(timestampSeconds) && timestampSeconds > 0
    ? timestampSeconds * 1000
    : null;
}

export class WhatsAppBotClient {
  private socket: WASocket | null = null;
  private currentQR: string | null = null;
  private isConnected = false;
  private targetGroupId: string | null = null;
  private readonly processedMessageIds = new Set<string>();

  constructor(
    private readonly config: AppConfig,
    private readonly queueService: QueueService,
    private readonly messenger: HouseMateMessenger
  ) {}

  public getSocket(): WASocket | null {
    return this.socket;
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
    if (this.targetGroupId) {
      return this.targetGroupId;
    }
    if (!this.socket || !this.isConnected) {
      return null;
    }

    try {
      const groups = await this.socket.groupFetchAllParticipating();
      if (this.config.groupId) {
        const configuredGroup = groups[this.config.groupId];
        if (!configuredGroup) {
          console.warn(
            `[WhatsAppClient] Configured group '${this.config.groupId}' is not available on this WhatsApp account.`
          );
          return null;
        }
        this.targetGroupId = this.config.groupId;
        console.log(
          `[WhatsAppClient] Found configured target group '${configuredGroup.subject}' JID: ${this.config.groupId}`
        );
        return this.config.groupId;
      }

      const normalizedTargetName = this.config.groupName.trim().toLowerCase();
      const matchingGroups = Object.entries(groups).filter(
        ([, metadata]) =>
          metadata.subject.trim().toLowerCase() === normalizedTargetName
      );
      if (matchingGroups.length > 1) {
        console.warn(
          `[WhatsAppClient] Found ${matchingGroups.length} groups named '${this.config.groupName}'. Using the first exact match.`
        );
      }

      const matchingGroup = matchingGroups[0];
      if (matchingGroup) {
        const [id, metadata] = matchingGroup;
        this.targetGroupId = id;
        console.log(
          `[WhatsAppClient] Found target group '${metadata.subject}' JID: ${id}`
        );
        return id;
      }
      console.warn(
        `[WhatsAppClient] Target group '${this.config.groupName}' not found. Active groups: ${
          Object.keys(groups).length
        }`
      );
    } catch (error) {
      console.error('[WhatsAppClient] Error fetching groups:', error);
    }
    return null;
  }

  public async start(): Promise<void> {
    console.log('[WhatsAppClient] Starting WhatsApp client.');
    const { state, saveCreds } = await useMultiFileAuthState(
      this.config.authDir
    );
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: 'silent' });
    const socket = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: ['House Mate Bot', 'Chrome', '1.0.0'],
      emitOwnEvents: true,
    });

    this.socket = socket;
    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.currentQR = qr;
        console.log('\n=================== WHATSAPP SCAN QR CODE ===================');
        qrcodeTerminal.generate(qr, { small: true });
        console.log(
          'Scan this QR code in WhatsApp > Settings > Linked devices.'
        );
        console.log('=============================================================\n');
      }

      if (connection === 'close') {
        this.isConnected = false;
        this.targetGroupId = null;
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;

        console.log(
          `[WhatsAppClient] Connection closed. Reconnecting: ${shouldReconnect}`
        );

        if (shouldReconnect) {
          setTimeout(() => {
            void this.start();
          }, 3_000);
        } else {
          console.error(
            '[WhatsAppClient] WhatsApp session logged out. Restart and scan a new QR code.'
          );
        }
        return;
      }

      if (connection === 'open') {
        this.isConnected = true;
        this.currentQR = null;
        console.log(
          '[WhatsAppClient] WhatsApp connection established successfully.'
        );
        const groupId = await this.getGroupId();
        if (groupId) {
          const welcomeSent = await this.messenger.sendStartupWelcome(
            socket,
            groupId
          );
          if (welcomeSent) {
            console.log(
              '[WhatsAppClient] Startup welcome card sent successfully.'
            );
          }
        }
      }
    });

    socket.ev.on('group-participants.update', async (update) => {
      try {
        if (update.action !== 'add' || update.participants.length === 0) {
          return;
        }

        const groupId = await this.getGroupId();
        if (!groupId || update.id !== groupId) {
          return;
        }

        await this.messenger.sendWelcome(
          socket,
          groupId,
          update.participants
        );
        console.log(
          `[WhatsAppClient] Welcome card sent for ${update.participants.length} new group participant(s).`
        );
      } catch (error) {
        console.error(
          '[WhatsAppClient] Could not welcome new group participants:',
          error
        );
      }
    });

    socket.ev.on('messages.upsert', async (upsert) => {
      for (const message of upsert.messages) {
        try {
          const groupId = await this.getGroupId();
          if (!isTargetGroupMessage(message.key.remoteJid, groupId)) {
            continue;
          }

          const command = parseHouseCommand(
            extractCommandText(message.message).trim()
          );
          if (!command) {
            continue;
          }

          const timestampMs = getMessageTimestampMs(message.messageTimestamp);
          const shouldProcess = shouldProcessMessageUpsert(
            upsert.type,
            message.key.fromMe,
            timestampMs
          );
          if (!shouldProcess) {
            console.warn(
              `[WhatsAppClient] Ignored /${command.name} event type=${
                upsert.type
              } fromMe=${Boolean(
                message.key.fromMe
              )} timestampPresent=${timestampMs !== null}.`
            );
            continue;
          }

          const messageId = message.key.id;
          if (messageId && this.processedMessageIds.has(messageId)) {
            continue;
          }
          if (messageId) {
            this.rememberProcessedMessageId(messageId);
          }

          console.log(
            `[WhatsAppClient] Handling /${command.name} type=${
              upsert.type
            } fromMe=${Boolean(message.key.fromMe)}`
          );
          await handleGroupMessage(
            socket,
            message,
            this.queueService,
            this.messenger
          );
          console.log(
            `[WhatsAppClient] Command /${command.name} handled successfully.`
          );
        } catch (error) {
          console.error('[WhatsAppClient] Error handling message:', error);
        }
      }
    });
  }

  private rememberProcessedMessageId(messageId: string): void {
    this.processedMessageIds.add(messageId);
    if (this.processedMessageIds.size <= MAX_PROCESSED_MESSAGE_IDS) {
      return;
    }

    const oldestMessageId = this.processedMessageIds.values().next().value;
    if (typeof oldestMessageId === 'string') {
      this.processedMessageIds.delete(oldestMessageId);
    }
  }
}
