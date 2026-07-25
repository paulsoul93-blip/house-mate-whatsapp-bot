import fs from 'fs';
import path from 'path';
import { QueueService } from '../services/queueService';

describe('QueueService tests', () => {
  const testDir = path.resolve(__dirname, '../../data_test');
  const testStateFile = path.resolve(testDir, 'state_test.json');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should initialize with default queue Pawel -> Merica -> Ozgur -> Kamil', () => {
    const queue = new QueueService(testStateFile, ['Pawel', 'Merica', 'Ozgur', 'Kamil']);
    expect(queue.getCurrentDuty()).toBe('Pawel');
    expect(queue.getNextDuty()).toBe('Merica');
    expect(queue.getMembers()).toEqual(['Pawel', 'Merica', 'Ozgur', 'Kamil']);
  });

  test('should advance queue correctly and wrap around', () => {
    const queue = new QueueService(testStateFile, ['Pawel', 'Merica', 'Ozgur', 'Kamil']);

    expect(queue.advanceDuty()).toBe('Merica');
    expect(queue.getCurrentDuty()).toBe('Merica');

    expect(queue.advanceDuty()).toBe('Ozgur');
    expect(queue.advanceDuty()).toBe('Kamil');
    expect(queue.advanceDuty()).toBe('Pawel');
  });

  test('should allow setting duty manually', () => {
    const queue = new QueueService(testStateFile, ['Pawel', 'Merica', 'Ozgur', 'Kamil']);
    const result = queue.setDuty('Ozgur');

    expect(result).toBe(true);
    expect(queue.getCurrentDuty()).toBe('Ozgur');
    expect(queue.getNextDuty()).toBe('Kamil');
  });

  test('should skip current duty person', () => {
    const queue = new QueueService(testStateFile, ['Pawel', 'Merica', 'Ozgur', 'Kamil']);
    const res = queue.skipCurrentDuty();

    expect(res.skipped).toBe('Pawel');
    expect(res.newDuty).toBe('Merica');
    expect(queue.getCurrentDuty()).toBe('Merica');
  });

  test('should persist state across instances', () => {
    const queue1 = new QueueService(testStateFile, ['Pawel', 'Merica', 'Ozgur', 'Kamil']);
    queue1.advanceDuty(); // now Merica

    const queue2 = new QueueService(testStateFile, ['Pawel', 'Merica', 'Ozgur', 'Kamil']);
    expect(queue2.getCurrentDuty()).toBe('Merica');
  });
});
