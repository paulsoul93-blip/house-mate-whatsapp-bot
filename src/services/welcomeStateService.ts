import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const welcomeStateSchema = z.object({
  sentVersions: z.array(z.string().min(1)).max(50),
});

interface WelcomeState {
  sentVersions: string[];
}

export class WelcomeStateService {
  constructor(private readonly stateFilePath: string) {}

  public shouldSend(version: string): boolean {
    return !this.readState().sentVersions.includes(version);
  }

  public markSent(version: string): void {
    const state = this.readState();
    if (!state.sentVersions.includes(version)) {
      state.sentVersions.push(version);
    }
    this.writeState({
      sentVersions: state.sentVersions.slice(-50),
    });
  }

  private readState(): WelcomeState {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return { sentVersions: [] };
      }
      const parsedJson: unknown = JSON.parse(
        fs.readFileSync(this.stateFilePath, 'utf8')
      );
      const result = welcomeStateSchema.safeParse(parsedJson);
      return result.success ? result.data : { sentVersions: [] };
    } catch {
      return { sentVersions: [] };
    }
  }

  private writeState(state: WelcomeState): void {
    fs.mkdirSync(path.dirname(this.stateFilePath), { recursive: true });
    fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  }
}
