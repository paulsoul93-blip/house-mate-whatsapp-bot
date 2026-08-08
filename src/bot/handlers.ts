import type { WASocket, proto } from '@whiskeysockets/baileys';
import { parseHouseCommand } from './commandParser';
import { extractCommandText } from './messageContent';
import { HouseMateMessenger } from '../services/houseMateMessenger';
import { QueueService } from '../services/queueService';

export async function handleGroupMessage(
  socket: WASocket,
  message: proto.IWebMessageInfo,
  queueService: QueueService,
  messenger: HouseMateMessenger
): Promise<void> {
  if (!message.message) {
    return;
  }

  const groupId = message.key.remoteJid;
  if (!groupId) {
    return;
  }

  const command = parseHouseCommand(extractCommandText(message.message));
  if (!command) {
    return;
  }

  if (command.name === 'cleaning') {
    await messenger.sendCleaning(socket, groupId);
    return;
  }

  if (command.name === 'bins') {
    await messenger.sendBins(socket, groupId);
    return;
  }

  if (command.name === 'welcome') {
    await messenger.sendWelcome(socket, groupId);
    return;
  }

  if (!message.key.fromMe) {
    console.warn(
      `[HouseMateCommands] Ignored owner-only command '${command.name}' from a group member.`
    );
    return;
  }

  if (command.name === 'next') {
    queueService.advanceDuty('Manual next duty command');
  } else if (command.name === 'previous') {
    queueService.previousDuty();
  } else if (command.name === 'skip') {
    queueService.skipCurrentDuty();
  } else if (command.name === 'set-duty') {
    const personName = command.args.join(' ');
    if (!personName || !queueService.setDuty(personName)) {
      await messenger.sendCleaning(socket, groupId);
      return;
    }
  }

  await messenger.sendCleaning(socket, groupId);
}
