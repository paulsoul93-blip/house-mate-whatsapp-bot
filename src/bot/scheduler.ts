import cron from 'node-cron';
import { WASocket } from '@whiskeysockets/baileys';
import { QueueService } from '../services/queueService';
import { AppConfig } from '../config';

export function setupScheduler(
  sockGetter: () => WASocket | null,
  getGroupId: () => Promise<string | null>,
  queueService: QueueService,
  config: AppConfig
): cron.ScheduledTask {
  console.log(
    `[Scheduler] Registering cron task '${config.scheduleCron}' in timezone '${config.scheduleTimezone}'`
  );

  const task = cron.schedule(
    config.scheduleCron,
    async () => {
      console.log('[Scheduler] Sunday 19:00 cron triggered!');
      try {
        const sock = sockGetter();
        if (!sock) {
          console.error('[Scheduler] Cannot send scheduled announcement: WhatsApp socket not connected.');
          return;
        }

        const groupId = await getGroupId();
        if (!groupId) {
          console.error(`[Scheduler] Cannot find target WhatsApp group '${config.groupName}'`);
          return;
        }

        // Advance duty queue for the new week
        const newDuty = queueService.advanceDuty('Sunday 19:00 Scheduled Duty Change');
        console.log(`[Scheduler] Duty advanced to: ${newDuty}`);

        const announcement = queueService.getWeeklyAnnouncement();
        await sock.sendMessage(groupId, { text: announcement });
        console.log('[Scheduler] Weekly announcement sent successfully!');
      } catch (err) {
        console.error('[Scheduler] Error running scheduled job:', err);
      }
    },
    {
      timezone: config.scheduleTimezone,
    }
  );

  return task;
}
