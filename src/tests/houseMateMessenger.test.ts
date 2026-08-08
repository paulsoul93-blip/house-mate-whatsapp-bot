import {
  buildBinsCaption,
  buildCleaningCaption,
} from '../services/houseMateMessenger';
import type {
  CouncilCollectionStatus,
  DutySchedule,
} from '../types/house';

describe('minimal WhatsApp card captions', () => {
  const schedule: DutySchedule = {
    current: {
      person: 'Pawel',
      startDate: '2026-07-27',
      endDate: '2026-08-02',
      formattedRange: 'Mon 27/07 \u2013 Sun 02/08',
    },
    next: {
      person: 'Merica',
      startDate: '2026-08-03',
      endDate: '2026-08-09',
      formattedRange: 'Mon 03/08 \u2013 Sun 09/08',
    },
  };
  const collectionStatus: CouncilCollectionStatus = {
    collection: {
      collectionDate: '2026-08-03',
      putOutDate: '2026-08-02',
      bins: ['recycling', 'food'],
    },
    checkedAt: '2026-07-31T12:00:00.000Z',
    source: 'live',
    sourceUrl: 'https://example.com/calendar',
  };

  it('keeps the cleaning caption to one useful line', () => {
    expect(buildCleaningCaption(schedule)).toBe(
      '\u{1F9F9} Pawel is on duty · Mon 27/07 \u2013 Sun 02/08'
    );
  });

  it('keeps the bin caption compact while preserving the action', () => {
    expect(buildBinsCaption(collectionStatus)).toBe(
      '♻️ Blue recycling bin + food caddy · Put out Sun 02/08 after 18:00'
    );
  });

  it('shows a concise safe error when council data is unavailable', () => {
    expect(
      buildBinsCaption({
        ...collectionStatus,
        collection: null,
        source: 'unavailable',
      })
    ).toBe('⚠️ Council data unavailable · Try /bins again shortly');
  });
});
