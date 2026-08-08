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
  announcementCron: string;
  scheduleTimezone: string;
  dataDir: string;
  pussyImagePaths: string[];
  binsImagePath: string;
  memberPhotoPaths: Readonly<Record<string, string>>;
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
  pussyImagePaths: environment.pussyImagePaths.map((imagePath) =>
    path.resolve(imagePath)
  ),
  binsImagePath: path.join(dataDir, 'bins-photo.png'),
  memberPhotoPaths: {
    pawel: path.join(dataDir, 'member-pawel.jpg'),
    merica: path.join(dataDir, 'member-merica.jpg'),
    ozgur: path.join(dataDir, 'member-ozgur.jpg'),
    kamil: path.join(dataDir, 'member-kamil.jpg'),
  },
  authDir: path.join(dataDir, 'auth_info'),
  stateFile: path.join(dataDir, 'state.json'),
  welcomeStateFile: path.join(dataDir, 'welcome-state.json'),
  binCalendarCacheFile: path.join(dataDir, 'bin-calendar-cache.json'),
};
