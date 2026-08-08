import { z } from 'zod';

const DEFAULT_COUNCIL_CALENDAR_URL =
  'https://servicelayer3c.azure-api.net/wastecalendar/calendar/ical/100090117435?authority=HDC&take=20';
const DEFAULT_COUNCIL_SOURCE_URL =
  'https://www.huntingdonshire.gov.uk/refuse-calendar/results?uprn=100090117435';

const rawEnvironmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535),
  HTTP_HOST: z.string().trim().min(1).max(120),
  WA_GROUP_NAME: z.string().trim().min(1).max(120),
  WA_GROUP_ID: z.string().trim().regex(/^\d+@(g\.us|broadcast)$/).optional(),
  DUTY_MEMBERS: z.string().trim().min(1),
  SCHEDULE_CRON: z.string().trim().min(1).max(80),
  ANNOUNCEMENT_CRON: z.string().trim().min(1).max(80),
  SCHEDULE_TIMEZONE: z.string().trim().min(1).max(80),
  DATA_DIR: z.string().trim().min(1),
  PUSSY_IMAGE_PATH: z.string().trim().min(1).max(260).optional(),
  PUSSY_IMAGE_PATHS: z.string().trim().min(1).max(2_000).optional(),
  HOUSE_ADDRESS: z.string().trim().min(1).max(160),
  HOUSE_POSTCODE: z.string().trim().regex(/^PE29\s?7BW$/i),
  COUNCIL_CALENDAR_URL: z.string().url(),
  COUNCIL_SOURCE_URL: z.string().url(),
  COUNCIL_CACHE_TTL_MINUTES: z.coerce.number().int().min(5).max(1_440),
  WELCOME_VERSION: z.string().trim().min(1).max(80),
});

export interface EnvironmentConfig {
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
  houseAddress: string;
  housePostcode: string;
  councilCalendarUrl: string;
  councilSourceUrl: string;
  councilCacheTtlMinutes: number;
  welcomeVersion: string;
}

export function parseEnvironment(
  environment: Record<string, string | undefined>
): EnvironmentConfig {
  const result = rawEnvironmentSchema.safeParse({
    PORT: environment.PORT ?? '3000',
    HTTP_HOST: environment.HTTP_HOST ?? '127.0.0.1',
    WA_GROUP_NAME: environment.WA_GROUP_NAME ?? 'House Mate App',
    WA_GROUP_ID: normaliseOptional(environment.WA_GROUP_ID),
    DUTY_MEMBERS: environment.DUTY_MEMBERS ?? 'Pawel,Merica,Ozgur,Kamil',
    SCHEDULE_CRON: environment.SCHEDULE_CRON ?? '0 19 * * 0',
    ANNOUNCEMENT_CRON: environment.ANNOUNCEMENT_CRON ?? '0 17 * * 0',
    SCHEDULE_TIMEZONE: environment.SCHEDULE_TIMEZONE ?? 'Europe/London',
    DATA_DIR: environment.DATA_DIR ?? './data',
    PUSSY_IMAGE_PATH: normaliseOptional(environment.PUSSY_IMAGE_PATH),
    PUSSY_IMAGE_PATHS: normaliseOptional(environment.PUSSY_IMAGE_PATHS),
    HOUSE_ADDRESS: environment.HOUSE_ADDRESS ?? '19 Silver Birch Close',
    HOUSE_POSTCODE: environment.HOUSE_POSTCODE ?? 'PE29 7BW',
    COUNCIL_CALENDAR_URL:
      environment.COUNCIL_CALENDAR_URL ?? DEFAULT_COUNCIL_CALENDAR_URL,
    COUNCIL_SOURCE_URL:
      environment.COUNCIL_SOURCE_URL ?? DEFAULT_COUNCIL_SOURCE_URL,
    COUNCIL_CACHE_TTL_MINUTES:
      environment.COUNCIL_CACHE_TTL_MINUTES ?? '360',
    WELCOME_VERSION: environment.WELCOME_VERSION ?? 'welcome-2026-07-v1',
  });

  if (!result.success) {
    const issueSummary = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid application configuration: ${issueSummary}`);
  }

  const dutyMembers = result.data.DUTY_MEMBERS.split(',')
    .map((member) => member.trim())
    .filter(Boolean);

  if (dutyMembers.length < 2 || new Set(dutyMembers.map((member) => member.toLowerCase())).size !== dutyMembers.length) {
    throw new Error(
      'Invalid application configuration: DUTY_MEMBERS must contain at least two unique names'
    );
  }

  const pussyImagePaths = (
    result.data.PUSSY_IMAGE_PATHS ??
    result.data.PUSSY_IMAGE_PATH ??
    './data/pussy.jpg'
  )
    .split(',')
    .map((imagePath) => imagePath.trim())
    .filter(Boolean);

  if (pussyImagePaths.length === 0) {
    throw new Error('Invalid application configuration: at least one shared photo path is required');
  }

  return {
    port: result.data.PORT,
    httpHost: result.data.HTTP_HOST,
    groupName: result.data.WA_GROUP_NAME,
    groupId: result.data.WA_GROUP_ID,
    dutyMembers,
    scheduleCron: result.data.SCHEDULE_CRON,
    announcementCron: result.data.ANNOUNCEMENT_CRON,
    scheduleTimezone: result.data.SCHEDULE_TIMEZONE,
    dataDir: result.data.DATA_DIR,
    pussyImagePaths,
    houseAddress: result.data.HOUSE_ADDRESS,
    housePostcode: result.data.HOUSE_POSTCODE.toUpperCase().replace(/^(PE29)\s?(7BW)$/, '$1 $2'),
    councilCalendarUrl: result.data.COUNCIL_CALENDAR_URL,
    councilSourceUrl: result.data.COUNCIL_SOURCE_URL,
    councilCacheTtlMinutes: result.data.COUNCIL_CACHE_TTL_MINUTES,
    welcomeVersion: result.data.WELCOME_VERSION,
  };
}

function normaliseOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
