import { WASocket, proto } from '@whiskeysockets/baileys';
import { QueueService } from '../services/queueService';

const startTime = new Date();

export async function handleGroupMessage(
  sock: WASocket,
  msg: proto.IWebMessageInfo,
  queueService: QueueService
): Promise<void> {
  if (!msg.message || msg.key.fromMe) return;

  const jid = msg.key.remoteJid;
  if (!jid) return;

  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    '';

  const trimmed = text.trim();
  if (!trimmed.startsWith('!')) return;

  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case 'duty':
    case 'kolejka':
    case 'grafik':
    case 'who':
      await sock.sendMessage(jid, { text: queueService.getStatusText() }, { quoted: msg });
      break;

    case 'next':
    case 'nastepny': {
      const newDuty = queueService.advanceDuty('Manual !next command');
      await sock.sendMessage(
        jid,
        {
          text: `🔄 *Zmieniono dyżurnego!*\nNowy dyżurny to: *${newDuty}*\n\n${queueService.getStatusText()}`,
        },
        { quoted: msg }
      );
      break;
    }

    case 'prev':
    case 'poprzedni': {
      const prevDuty = queueService.previousDuty();
      await sock.sendMessage(
        jid,
        {
          text: `⬅️ *Cofnięto dyżurnego!*\nObecny dyżurny to: *${prevDuty}*\n\n${queueService.getStatusText()}`,
        },
        { quoted: msg }
      );
      break;
    }

    case 'skip':
    case 'pomin': {
      const { skipped, newDuty } = queueService.skipCurrentDuty();
      await sock.sendMessage(
        jid,
        {
          text: `⏭️ *Pominięto osobę:* ${skipped}\nNowy dyżurny na ten tydzień: *${newDuty}*`,
        },
        { quoted: msg }
      );
      break;
    }

    case 'setduty':
    case 'ustaw': {
      const targetName = args.join(' ');
      if (!targetName) {
        await sock.sendMessage(
          jid,
          { text: '⚠️ Podaj imię osoby! Przykład: `!setduty Merica`' },
          { quoted: msg }
        );
        return;
      }
      const success = queueService.setDuty(targetName);
      if (success) {
        await sock.sendMessage(
          jid,
          {
            text: `✅ *Ustawiono dyżurnego na:* ${queueService.getCurrentDuty()}\n\n${queueService.getStatusText()}`,
          },
          { quoted: msg }
        );
      } else {
        const available = queueService.getMembers().join(', ');
        await sock.sendMessage(
          jid,
          { text: `❌ Nie znaleziono osoby "${targetName}". Dostępne osoby: ${available}` },
          { quoted: msg }
        );
      }
      break;
    }

    case 'remind':
    case 'przypomnij': {
      await sock.sendMessage(jid, { text: queueService.getWeeklyAnnouncement() });
      break;
    }

    case 'ping':
    case 'status': {
      const uptimeMs = Date.now() - startTime.getTime();
      const uptimeMin = Math.floor(uptimeMs / 60000);
      const uptimeHours = Math.floor(uptimeMin / 60);

      await sock.sendMessage(
        jid,
        {
          text:
            `🤖 *HOUSE MATE BOT STATUS*\n\n` +
            `✅ *Stan:* Działa poprawnie\n` +
            `⏱️ *Uptime:* ${uptimeHours}h ${uptimeMin % 60}m\n` +
            `👤 *Obecny dyżurny:* ${queueService.getCurrentDuty()}`,
        },
        { quoted: msg }
      );
      break;
    }

    case 'help':
    case 'pomoc':
      await sock.sendMessage(
        jid,
        {
          text:
            `📖 *KOMENDY BOTA HOUSE MATE APP*\n\n` +
            `• \`!duty\` / \`!kolejka\` - Pokazuje obecnego dyżurnego i grafik\n` +
            `• \`!next\` / \`!nastepny\` - Przechodzi do następnej osoby w kolejce\n` +
            `• \`!prev\` / \`!poprzedni\` - Cofa do poprzedniej osoby\n` +
            `• \`!skip\` / \`!pomin\` - Pomija obecną osobę na ten tydzień\n` +
            `• \`!setduty <imię>\` - Ustawia wybraną osobę jako dyżurnego\n` +
            `• \`!remind\` - Wysyła oficjalne przypomnienie tygodniowe\n` +
            `• \`!status\` - Pokazuje status i uptime bota\n` +
            `• \`!help\` - Pokazuje tę wiadomość pomocy`,
        },
        { quoted: msg }
      );
      break;
  }
}
