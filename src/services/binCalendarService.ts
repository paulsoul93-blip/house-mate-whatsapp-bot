import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { addDays, getLocalDate } from '../lib/date';
import type {
  BinKind,
  CouncilCollection,
  CouncilCollectionStatus,
  IsoDate,
  NextCouncilCollection,
} from '../types/house';

const binKindSchema = z.enum(['recycling', 'residual', 'food']);
const councilCollectionSchema = z.object({
  collectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bins: z.array(binKindSchema).min(1),
});
const cacheSchema = z.object({
  fetchedAt: z.string().datetime(),
  collections: z.array(councilCollectionSchema).min(1),
});
const calendarBodySchema = z.string().min(20).max(2_000_000);

const BIN_ORDER: Readonly<Record<BinKind, number>> = {
  recycling: 0,
  residual: 1,
  food: 2,
};

export interface BinCalendarServiceOptions {
  calendarUrl: string;
  sourceUrl: string;
  cacheFilePath: string;
  cacheTtlMinutes: number;
  timeZone: string;
  now?: () => Date;
  fetcher?: CalendarFetcher;
  timeoutMs?: number;
  retryCount?: number;
}

interface CalendarFetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

type CalendarFetcher = (
  url: string,
  init: RequestInit
) => Promise<CalendarFetchResponse>;

interface CalendarCache {
  fetchedAt: string;
  collections: CouncilCollection[];
}

export function parseCouncilCalendar(calendarBody: string): CouncilCollection[] {
  const bodyResult = calendarBodySchema.safeParse(calendarBody);
  if (
    !bodyResult.success ||
    !calendarBody.includes('BEGIN:VCALENDAR') ||
    !calendarBody.includes('END:VCALENDAR')
  ) {
    throw new Error('Invalid council calendar response');
  }

  const unfoldedLines = calendarBody
    .replace(/\r\n[ \t]/g, '')
    .replace(/\r/g, '')
    .split('\n');
  const collectionsByDate = new Map<IsoDate, Set<BinKind>>();
  let currentEvent: Record<string, string> | null = null;

  for (const rawLine of unfoldedLines) {
    const line = rawLine.trim();
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (currentEvent) {
        addEventToCollections(currentEvent, collectionsByDate);
      }
      currentEvent = null;
      continue;
    }
    if (!currentEvent) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }
    const propertyName = line
      .slice(0, separatorIndex)
      .split(';')[0]
      .toUpperCase();
    currentEvent[propertyName] = line.slice(separatorIndex + 1).trim();
  }

  const collections = Array.from(collectionsByDate.entries())
    .map(([collectionDate, bins]) => ({
      collectionDate,
      bins: Array.from(bins).sort(
        (left, right) => BIN_ORDER[left] - BIN_ORDER[right]
      ),
    }))
    .sort((left, right) =>
      left.collectionDate.localeCompare(right.collectionDate)
    );

  if (collections.length === 0) {
    throw new Error('Invalid council calendar response');
  }

  return collections;
}

export function findNextCollection(
  collections: CouncilCollection[],
  currentDate: string
): NextCouncilCollection | null {
  const nextCollection = collections.find(
    (collection) => collection.collectionDate >= currentDate
  );
  if (!nextCollection) {
    return null;
  }

  return {
    ...nextCollection,
    putOutDate: addDays(nextCollection.collectionDate, -1),
  };
}

export class BinCalendarService {
  private readonly now: () => Date;
  private readonly fetcher: CalendarFetcher;
  private readonly timeoutMs: number;
  private readonly retryCount: number;

  constructor(private readonly options: BinCalendarServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.fetcher =
      options.fetcher ??
      (async (url, init) => {
        return fetch(url, init);
      });
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.retryCount = options.retryCount ?? 2;
  }

  public async getNextCollection(
    forceRefresh = false
  ): Promise<CouncilCollectionStatus> {
    const currentDate = getLocalDate(this.now(), this.options.timeZone);
    const cache = await this.readCache();
    const freshCache =
      cache &&
      this.now().getTime() - new Date(cache.fetchedAt).getTime() <=
        this.options.cacheTtlMinutes * 60_000;

    if (!forceRefresh && freshCache) {
      return this.buildStatus(cache.collections, cache.fetchedAt, 'cache', currentDate);
    }

    try {
      const liveCollections = await this.fetchLiveCalendar();
      const fetchedAt = this.now().toISOString();
      await this.writeCache({
        fetchedAt,
        collections: liveCollections,
      });
      return this.buildStatus(liveCollections, fetchedAt, 'live', currentDate);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BinCalendarService] Live council lookup failed: ${message}`);
      if (cache) {
        return this.buildStatus(cache.collections, cache.fetchedAt, 'cache', currentDate);
      }
      return {
        collection: null,
        checkedAt: this.now().toISOString(),
        source: 'unavailable',
        sourceUrl: this.options.sourceUrl,
      };
    }
  }

  private buildStatus(
    collections: CouncilCollection[],
    checkedAt: string,
    source: 'live' | 'cache',
    currentDate: IsoDate
  ): CouncilCollectionStatus {
    return {
      collection: findNextCollection(collections, currentDate),
      checkedAt,
      source,
      sourceUrl: this.options.sourceUrl,
    };
  }

  private async fetchLiveCalendar(): Promise<CouncilCollection[]> {
    let finalError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetcher(this.options.calendarUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/calendar',
            'User-Agent': 'HouseMateWhatsAppBot/1.0',
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Council calendar returned HTTP ${response.status}`);
        }
        const body = await response.text();
        return parseCouncilCalendar(body);
      } catch (error) {
        finalError =
          error instanceof Error ? error : new Error('Council calendar request failed');
        if (attempt < this.retryCount) {
          await delay(400 * (attempt + 1));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw finalError ?? new Error('Council calendar request failed');
  }

  private async readCache(): Promise<CalendarCache | null> {
    try {
      const rawJson: unknown = JSON.parse(
        await fs.readFile(this.options.cacheFilePath, 'utf8')
      );
      const result = cacheSchema.safeParse(rawJson);
      if (!result.success) {
        return null;
      }
      return {
        fetchedAt: result.data.fetchedAt,
        collections: result.data.collections.map((collection) => ({
          collectionDate: collection.collectionDate as IsoDate,
          bins: collection.bins,
        })),
      };
    } catch {
      return null;
    }
  }

  private async writeCache(cache: CalendarCache): Promise<void> {
    await fs.mkdir(path.dirname(this.options.cacheFilePath), { recursive: true });
    await fs.writeFile(
      this.options.cacheFilePath,
      JSON.stringify(cache, null, 2),
      'utf8'
    );
  }
}

function addEventToCollections(
  event: Record<string, string>,
  collectionsByDate: Map<IsoDate, Set<BinKind>>
): void {
  const dateMatch = /^(\d{4})(\d{2})(\d{2})/.exec(event.DTSTART ?? '');
  const binKind = normaliseBinKind(event.SUMMARY ?? '');
  if (!dateMatch || !binKind) {
    return;
  }

  const collectionDate =
    `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` as IsoDate;
  const bins = collectionsByDate.get(collectionDate) ?? new Set<BinKind>();
  bins.add(binKind);
  collectionsByDate.set(collectionDate, bins);
}

function normaliseBinKind(summary: string): BinKind | null {
  const normalisedSummary = summary.trim().toLowerCase();
  if (normalisedSummary.includes('recycling')) {
    return 'recycling';
  }
  if (normalisedSummary.includes('food')) {
    return 'food';
  }
  if (
    normalisedSummary.includes('normal waste') ||
    normalisedSummary.includes('domestic waste') ||
    normalisedSummary.includes('rubbish')
  ) {
    return 'residual';
  }
  return null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
