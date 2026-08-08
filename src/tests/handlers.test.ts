import type { WASocket, proto } from '@whiskeysockets/baileys';
import { handleGroupMessage } from '../bot/handlers';
import type { HouseMateMessenger } from '../services/houseMateMessenger';
import type { QueueService } from '../services/queueService';

describe('house group handlers', () => {
  it('lets the owner preview the Sunday handover without touching the rota', async () => {
    const sendWeeklyHandover: jest.MockedFunction<
      (socket: WASocket, groupId: string) => Promise<void>
    > = jest.fn().mockResolvedValue(undefined);
    const messenger = {
      sendWeeklyHandover,
    } as unknown as HouseMateMessenger;
    const queueService = {} as QueueService;
    const socket = {} as WASocket;
    const message = {
      key: {
        remoteJid: '120363428121220076@g.us',
        fromMe: true,
      },
      message: {
        conversation: '/testweekly',
      },
    } as proto.IWebMessageInfo;

    await handleGroupMessage(socket, message, queueService, messenger);

    expect(sendWeeklyHandover).toHaveBeenCalledWith(
      socket,
      '120363428121220076@g.us'
    );
  });

  it('ignores the owner-only preview from another member', async () => {
    const sendWeeklyHandover: jest.MockedFunction<
      (socket: WASocket, groupId: string) => Promise<void>
    > = jest.fn().mockResolvedValue(undefined);
    const messenger = {
      sendWeeklyHandover,
    } as unknown as HouseMateMessenger;
    const queueService = {} as QueueService;
    const socket = {} as WASocket;
    const message = {
      key: {
        remoteJid: '120363428121220076@g.us',
        fromMe: false,
      },
      message: {
        conversation: '/testweekly',
      },
    } as proto.IWebMessageInfo;

    await handleGroupMessage(socket, message, queueService, messenger);

    expect(sendWeeklyHandover).not.toHaveBeenCalled();
  });
});
