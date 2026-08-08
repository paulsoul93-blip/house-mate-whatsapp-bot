import type { WASocket } from '@whiskeysockets/baileys';
import cron, { ScheduledTask } from 'node-cron';
import type { AppConfig } from '../config';
import { HouseMateMessenger } from '../services/houseMateMessenger';
import { QueueService } from '../services/queueService';

export function setupScheduler(
  socketGetter: () => WASocket | null,
  getGroupId: () => Promise<string | null>,
  queueService: QueueService,
  messenger: HouseMateMessenger,
  config: AppConfig
): ScheduledTask[] {
  console.log(
    `[Scheduler] Registering Sunday announcement '${config.announcementCron}' and handover '${config.scheduleCron}' in timezone '${config.scheduleTimezone}'.`
  );

  const announcementTask = cron.schedule(
    config.announcementCron,
    async () => {
      console.log('[Scheduler] Sunday next-week announcement triggered.');
      try {
        const socket = socketGetter();
        if (!socket) {
          console.error(
            '[Scheduler] Cannot send the Sunday announcement: WhatsApp is not connected.'
          );
          return;
        }

        const groupId = await getGroupId();
        if (!groupId) {
          console.error(
            `[Scheduler] Cannot find target WhatsApp group '${config.groupName}'.`
          );
          return;
        }

        await messenger.sendSundayAnnouncement(socket, groupId);
        console.log('[Scheduler] Sunday next-week announcement sent successfully.');
      } catch (error) {
        console.error('[Scheduler] Error running Sunday announcement:', error);
      }
    },
    {
      timezone: config.scheduleTimezone,
    }
  );

  const handoverTask = cron.schedule(
    config.scheduleCron,
    async () => {
      console.log('[Scheduler] Weekly house handover triggered.');
      try {
        const socket = socketGetter();
        if (!socket) {
          console.error(
            '[Scheduler] Cannot send the weekly card: WhatsApp is not connected.'
          );
          return;
        }

        const groupId = await getGroupId();
        if (!groupId) {
          console.error(
            `[Scheduler] Cannot find target WhatsApp group '${config.groupName}'.`
          );
          return;
        }

        const newDuty = queueService.advanceDuty(
          'Sunday 19:00 scheduled duty handover',
          queueService.getNextPeriodStart()
        );
        console.log(`[Scheduler] Duty advanced to: ${newDuty}`);

        await messenger.sendWeeklyHandover(socket, groupId);
        console.log(
          '[Scheduler] Weekly visual cleaning card sent successfully.'
        );
      } catch (error) {
        console.error('[Scheduler] Error running scheduled job:', error);
      }
    },
    {
      timezone: config.scheduleTimezone,
    }
  );

  return [announcementTask, handoverTask];
}
