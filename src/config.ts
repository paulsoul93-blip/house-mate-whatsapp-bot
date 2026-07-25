import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppConfig {
  port: number;
  groupName: string;
  dutyMembers: string[];
  scheduleCron: string;
  scheduleTimezone: string;
  dataDir: string;
  authDir: string;
  stateFile: string;
}

const dataDir = process.env.DATA_DIR || './data';

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  groupName: process.env.WA_GROUP_NAME || 'House Mate App',
  dutyMembers: (process.env.DUTY_MEMBERS || 'Pawel,Merica,Ozgur,Kamil')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  scheduleCron: process.env.SCHEDULE_CRON || '0 19 * * 0',
  scheduleTimezone: process.env.SCHEDULE_TIMEZONE || 'Europe/London',
  dataDir: path.resolve(dataDir),
  authDir: path.resolve(dataDir, 'auth_info'),
  stateFile: path.resolve(dataDir, 'state.json'),
};
