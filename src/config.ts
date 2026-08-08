import path from 'path';
import dotenv from 'dotenv';
import { parseEnvironment } from './lib/environment';

dotenv.config();

export interface AppConfig {
  port: number;
  httpHost: string;
  groupName: string;
  groupId?: string;
  dutyMembers: string[];
  scheduleCron: string;
  scheduleTimezone: string;
  dataDir: string;
  pussyImagePath: string;
  authDir: string;
  stateFile: string;
  welcomeStateFile: string;
  binCalendarCacheFile: string;
  houseAddress: string;
  housePostcode: string;
  councilCalendarUrl: string;
  councilSourceUrl: string;
  councilCacheTtlMinutes: number;
  welcomeVersion: string;
}

const environment = parseEnvironment(process.env);
const dataDir = path.resolve(environment.dataDir);

export const config: AppConfig = {
  ...environment,
  dataDir,
  pussyImagePath: path.resolve(environment.pussyImagePath),
  authDir: path.join(dataDir, 'auth_info'),
  stateFile: path.join(dataDir, 'state.json'),
  welcomeStateFile: path.join(dataDir, 'welcome-state.json'),
  binCalendarCacheFile: path.join(dataDir, 'bin-calendar-cache.json'),
};
