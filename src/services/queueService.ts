import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  addDays,
  differenceInWeeks,
  formatDateRange,
  getLocalWeekStart,
  toIsoDate,
} from '../lib/date';
import type { DutySchedule, IsoDate } from '../types/house';

const historyEntrySchema = z.object({
  date: z.string().datetime(),
  person: z.string().min(1),
  action: z.string().min(1),
});

const dutyStateSchema = z.object({
  members: z.array(z.string().min(1)).min(1),
  currentIndex: z.number().int().nonnegative(),
  currentPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastRotatedAt: z.string().datetime().optional(),
  history: z.array(historyEntrySchema),
});

export interface DutyState {
  members: string[];
  currentIndex: number;
  currentPeriodStart: IsoDate;
  lastRotatedAt?: string;
  history: Array<{
    date: string;
    person: string;
    action: string;
  }>;
}

export interface QueueServiceOptions {
  now?: () => Date;
  timeZone?: string;
}

export class QueueService {
  private readonly now: () => Date;
  private readonly timeZone: string;
  private members: string[];
  private currentIndex = 0;
  private currentPeriodStart: IsoDate;
  private history: DutyState['history'] = [];

  constructor(
    private readonly stateFilePath: string,
    initialMembers: string[] = ['Pawel', 'Merica', 'Ozgur', 'Kamil'],
    options: QueueServiceOptions = {}
  ) {
    this.now = options.now ?? (() => new Date());
    this.timeZone = options.timeZone ?? 'Europe/London';
    this.members = [...initialMembers];
    this.currentPeriodStart = getLocalWeekStart(this.now(), this.timeZone);

    this.loadState();
    this.synchroniseToCurrentWeek();
  }

  public getCurrentDuty(): string {
    return this.members[this.currentIndex] ?? 'Unknown';
  }

  public getNextDuty(): string {
    const nextIndex = (this.currentIndex + 1) % this.members.length;
    return this.members[nextIndex] ?? 'Unknown';
  }

  public getMembers(): string[] {
    return [...this.members];
  }

  public getDutySchedule(): DutySchedule {
    const currentEnd = addDays(this.currentPeriodStart, 6);
    const nextStart = addDays(this.currentPeriodStart, 7);
    const nextEnd = addDays(nextStart, 6);

    return {
      current: {
        person: this.getCurrentDuty(),
        startDate: this.currentPeriodStart,
        endDate: currentEnd,
        formattedRange: formatDateRange(this.currentPeriodStart, currentEnd),
      },
      next: {
        person: this.getNextDuty(),
        startDate: nextStart,
        endDate: nextEnd,
        formattedRange: formatDateRange(nextStart, nextEnd),
      },
    };
  }

  public getNextPeriodStart(): IsoDate {
    return addDays(this.currentPeriodStart, 7);
  }

  public advanceDuty(
    action = 'Weekly schedule advance',
    periodStart: string = this.getNextPeriodStart()
  ): string {
    this.currentIndex = (this.currentIndex + 1) % this.members.length;
    this.currentPeriodStart = toIsoDate(periodStart);
    const current = this.getCurrentDuty();
    this.recordHistory(current, action);
    this.saveState();
    return current;
  }

  public previousDuty(): string {
    this.currentIndex =
      (this.currentIndex - 1 + this.members.length) % this.members.length;
    const current = this.getCurrentDuty();
    this.recordHistory(current, 'Manual previous duty');
    this.saveState();
    return current;
  }

  public skipCurrentDuty(): { skipped: string; newDuty: string } {
    const skipped = this.getCurrentDuty();
    this.currentIndex = (this.currentIndex + 1) % this.members.length;
    const newDuty = this.getCurrentDuty();
    this.recordHistory(newDuty, `Skipped ${skipped}`);
    this.saveState();
    return { skipped, newDuty };
  }

  public setDuty(personName: string): boolean {
    const targetIndex = this.members.findIndex(
      (member) => member.toLowerCase() === personName.toLowerCase()
    );
    if (targetIndex === -1) {
      return false;
    }

    this.currentIndex = targetIndex;
    const current = this.getCurrentDuty();
    this.recordHistory(current, `Manually set duty to ${current}`);
    this.saveState();
    return true;
  }

  public getStatusText(): string {
    const schedule = this.getDutySchedule();
    return [
      'HOUSE CLEANING ROTA',
      `Current: ${schedule.current.person} (${schedule.current.formattedRange})`,
      `Next: ${schedule.next.person} (${schedule.next.formattedRange})`,
      'Use /cleaning for the full visual rota.',
    ].join('\n');
  }

  public getWeeklyAnnouncement(): string {
    const schedule = this.getDutySchedule();
    return [
      'WEEKLY HOUSE HANDOVER',
      `${schedule.current.person} is on cleaning duty from ${schedule.current.formattedRange}.`,
      `${schedule.next.person} is next from ${schedule.next.formattedRange}.`,
      'Use /cleaning for the full visual checklist.',
    ].join('\n');
  }

  private loadState(): void {
    this.ensureDirectory();
    if (!fs.existsSync(this.stateFilePath)) {
      this.saveState();
      return;
    }

    try {
      const parsedJson: unknown = JSON.parse(
        fs.readFileSync(this.stateFilePath, 'utf8')
      );
      const result = dutyStateSchema.safeParse(parsedJson);
      if (!result.success) {
        console.error('[QueueService] Stored rota state is invalid; using safe defaults.');
        this.saveState();
        return;
      }

      const persistedCurrentMember =
        result.data.members[result.data.currentIndex % result.data.members.length];
      const matchingIndex = this.members.findIndex(
        (member) => member.toLowerCase() === persistedCurrentMember?.toLowerCase()
      );
      this.currentIndex = matchingIndex >= 0 ? matchingIndex : 0;
      this.currentPeriodStart = result.data.currentPeriodStart
        ? toIsoDate(result.data.currentPeriodStart)
        : getLocalWeekStart(this.now(), this.timeZone);
      this.history = result.data.history;
    } catch {
      console.error('[QueueService] Could not read rota state; using safe defaults.');
      this.saveState();
    }
  }

  private synchroniseToCurrentWeek(): void {
    const currentWeekStart = getLocalWeekStart(this.now(), this.timeZone);
    const elapsedWeeks = differenceInWeeks(
      this.currentPeriodStart,
      currentWeekStart
    );
    if (elapsedWeeks === 0) {
      return;
    }

    this.currentIndex =
      (this.currentIndex + elapsedWeeks) % this.members.length;
    this.currentPeriodStart = addDays(
      this.currentPeriodStart,
      elapsedWeeks * 7
    );
    this.recordHistory(
      this.getCurrentDuty(),
      `Automatically synchronised ${elapsedWeeks} missed week(s)`
    );
    this.saveState();
  }

  private recordHistory(person: string, action: string): void {
    this.history.push({
      date: this.now().toISOString(),
      person,
      action,
    });
    this.history = this.history.slice(-50);
  }

  private ensureDirectory(): void {
    fs.mkdirSync(path.dirname(this.stateFilePath), { recursive: true });
  }

  private saveState(): void {
    this.ensureDirectory();
    const state: DutyState = {
      members: this.members,
      currentIndex: this.currentIndex,
      currentPeriodStart: this.currentPeriodStart,
      lastRotatedAt: this.now().toISOString(),
      history: this.history,
    };
    fs.writeFileSync(
      this.stateFilePath,
      JSON.stringify(state, null, 2),
      'utf8'
    );
  }
}
