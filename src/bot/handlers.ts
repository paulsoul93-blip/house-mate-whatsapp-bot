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

  if (command.name === 'pussy') {
    try {
      await messenger.sendPussy(socket, groupId);
    } catch (error) {
      console.error('[HouseMateCommands] Shared photo could not be sent:', error);
      await socket.sendMessage(groupId, {
        text: '\u{26A0}\u{FE0F} Shared photo is currently unavailable.',
      });
    }
    return;
  }

  if (command.name === 'member-photo') {
    const personName = command.args[0];
    if (!personName) {
      return;
    }

    try {
      await messenger.sendMemberPhoto(socket, groupId, personName);
    } catch (error) {
      console.error('[HouseMateCommands] Member photo could not be sent:', error);
      await socket.sendMessage(groupId, {
        text: '\u26A0\uFE0F Member photo is currently unavailable.',
      });
    }
    return;
  }

  if (command.name === 'welcome') {
    await messenger.sendWelcome(socket, groupId);
    return;
  }

  if (command.name === 'test-weekly') {
    if (!message.key.fromMe) {
      console.warn(
        '[HouseMateCommands] Ignored admin-only command \'test-weekly\' from a group member.'
      );
      return;
    }

    await messenger.sendWeeklyHandover(socket, groupId);
    return;
  }

  if (command.name === 'test-sunday') {
    if (!message.key.fromMe) {
      console.warn(
        '[HouseMateCommands] Ignored admin-only command \'test-sunday\' from a group member.'
      );
      return;
    }

    await messenger.sendSundayAnnouncement(socket, groupId);
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
