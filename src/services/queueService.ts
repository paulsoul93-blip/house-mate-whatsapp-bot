import fs from 'fs';
import path from 'path';

export interface DutyState {
  members: string[];
  currentIndex: number;
  lastRotatedAt?: string;
  history: Array<{
    date: string;
    person: string;
    action: string;
  }>;
}

export class QueueService {
  private stateFilePath: string;
  private members: string[];
  private currentIndex: number;
  private history: DutyState['history'];

  constructor(stateFilePath: string, initialMembers: string[] = ['Pawel', 'Merica', 'Ozgur', 'Kamil']) {
    this.stateFilePath = stateFilePath;
    this.members = initialMembers;
    this.currentIndex = 0;
    this.history = [];

    this.loadState();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public loadState(): void {
    try {
      this.ensureDirectory();
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8');
        const parsed: DutyState = JSON.parse(data);

        if (Array.isArray(parsed.members) && parsed.members.length > 0) {
          this.members = parsed.members;
        }
        if (typeof parsed.currentIndex === 'number' && parsed.currentIndex >= 0) {
          this.currentIndex = parsed.currentIndex % this.members.length;
        }
        if (Array.isArray(parsed.history)) {
          this.history = parsed.history;
        }
      } else {
        this.saveState('Initial state created');
      }
    } catch (err) {
      console.error('Failed to load queue state, using defaults:', err);
    }
  }

  public saveState(action = 'State update'): void {
    try {
      this.ensureDirectory();
      const state: DutyState = {
        members: this.members,
        currentIndex: this.currentIndex,
        lastRotatedAt: new Date().toISOString(),
        history: this.history.slice(-50), // keep last 50 entries
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save queue state:', err);
    }
  }

  public getCurrentDuty(): string {
    return this.members[this.currentIndex] || 'Unknown';
  }

  public getNextDuty(): string {
    const nextIndex = (this.currentIndex + 1) % this.members.length;
    return this.members[nextIndex] || 'Unknown';
  }

  public advanceDuty(action = 'Weekly schedule / Advance'): string {
    this.currentIndex = (this.currentIndex + 1) % this.members.length;
    const current = this.getCurrentDuty();
    this.history.push({
      date: new Date().toISOString(),
      person: current,
      action,
    });
    this.saveState(action);
    return current;
  }

  public previousDuty(): string {
    this.currentIndex = (this.currentIndex - 1 + this.members.length) % this.members.length;
    const current = this.getCurrentDuty();
    this.history.push({
      date: new Date().toISOString(),
      person: current,
      action: 'Previous duty',
    });
    this.saveState('Previous duty');
    return current;
  }

  public skipCurrentDuty(): { skipped: string; newDuty: string } {
    const skipped = this.getCurrentDuty();
    this.currentIndex = (this.currentIndex + 1) % this.members.length;
    const newDuty = this.getCurrentDuty();
    this.history.push({
      date: new Date().toISOString(),
      person: newDuty,
      action: `Skipped ${skipped}`,
    });
    this.saveState(`Skipped ${skipped}`);
    return { skipped, newDuty };
  }

  public setDuty(personName: string): boolean {
    const targetIndex = this.members.findIndex(
      (m) => m.toLowerCase() === personName.toLowerCase()
    );
    if (targetIndex === -1) {
      return false;
    }
    this.currentIndex = targetIndex;
    this.history.push({
      date: new Date().toISOString(),
      person: this.members[targetIndex],
      action: `Manual set to ${this.members[targetIndex]}`,
    });
    this.saveState(`Manual set to ${this.members[targetIndex]}`);
    return true;
  }

  public getMembers(): string[] {
    return [...this.members];
  }

  public getStatusText(): string {
    const current = this.getCurrentDuty();
    const next = this.getNextDuty();
    const list = this.members
      .map((m, idx) => (idx === this.currentIndex ? `👉 *${m}* (Dyżurny)` : `   ${m}`))
      .join('\n');

    return (
      `🏠 *HOUSE MATE APP - GRAFIK DYŻURÓW*\n\n` +
      `👤 *Obecny dyżurny:* ${current}\n` +
      `➡️ *Następna osoba:* ${next}\n\n` +
      `📋 *Kolejka:* \n${list}\n\n` +
      `💬 _Napisz !help aby zobaczyć dostępne komendy._`
    );
  }

  public getWeeklyAnnouncement(): string {
    const current = this.getCurrentDuty();
    const next = this.getNextDuty();

    return (
      `🔔 *PRZYPOMNIENIE O DYŻURZE - HOUSE MATE APP* 🔔\n\n` +
      `Oto grafik na nadchodzący tydzień:\n` +
      `✨ *Dyżurny tygodnia:* @${current} (Obowiązki sprzątania)\n` +
      `⏳ *W kolejce na przyszły tydzień:* ${next}\n\n` +
      `Prosimy o utrzymanie czystości i porządku! 🧹✨\n` +
      `_Dobrego tygodnia dla całej ekipy!_ 🏠❤️`
    );
  }
}
