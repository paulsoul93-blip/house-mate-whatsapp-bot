import fs from 'fs';
import path from 'path';
import { WelcomeStateService } from '../services/welcomeStateService';

describe('WelcomeStateService', () => {
  const testDirectory = path.resolve(__dirname, '../../data_test_welcome');
  const stateFile = path.join(testDirectory, 'welcome.json');

  beforeEach(() => {
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it('sends each welcome version once', () => {
    const state = new WelcomeStateService(stateFile);

    expect(state.shouldSend('welcome-v1')).toBe(true);
    state.markSent('welcome-v1');
    expect(state.shouldSend('welcome-v1')).toBe(false);
    expect(state.shouldSend('welcome-v2')).toBe(true);
  });
});
