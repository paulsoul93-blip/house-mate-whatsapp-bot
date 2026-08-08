import fs from 'fs';
import path from 'path';
import { QueueService } from '../services/queueService';

describe('QueueService duty periods', () => {
  const testDirectory = path.resolve(__dirname, '../../data_test_duty_periods');
  const stateFile = path.join(testDirectory, 'state.json');
  const members = ['Pawel', 'Merica', 'Ozgur', 'Kamil'];

  beforeEach(() => {
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it('shows the current and next Monday-to-Sunday duty periods', () => {
    const queue = new QueueService(stateFile, members, {
      now: () => new Date('2026-07-31T12:00:00Z'),
      timeZone: 'Europe/London',
    });

    expect(queue.getDutySchedule()).toEqual({
      current: {
        person: 'Pawel',
        startDate: '2026-07-27',
        endDate: '2026-08-02',
        formattedRange: 'Mon 27/07 – Sun 02/08',
      },
      next: {
        person: 'Merica',
        startDate: '2026-08-03',
        endDate: '2026-08-09',
        formattedRange: 'Mon 03/08 – Sun 09/08',
      },
    });
  });

  it('moves the rota and its period forward together at Sunday handover', () => {
    const queue = new QueueService(stateFile, members, {
      now: () => new Date('2026-08-02T18:00:00Z'),
      timeZone: 'Europe/London',
    });

    queue.advanceDuty('Sunday handover', '2026-08-03');

    expect(queue.getDutySchedule().current).toEqual({
      person: 'Merica',
      startDate: '2026-08-03',
      endDate: '2026-08-09',
      formattedRange: 'Mon 03/08 – Sun 09/08',
    });
  });
});
