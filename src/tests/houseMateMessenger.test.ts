import {
  buildBinsCaption,
  buildCleaningCaption,
  buildSundayAnnouncementCaption,
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

  it('keeps the cleaning caption short and spaced', () => {
    expect(buildCleaningCaption(schedule)).toBe(
      '\u{1F9F9} NOW \u00B7 Pawel \u00B7 Mon 27/07 \u2013 Sun 02/08\n\u{27A1}\uFE0F NEXT \u00B7 Merica \u00B7 Mon 03/08 \u2013 Sun 09/08'
    );
  });

  it('keeps the bin caption compact and names the selected colour', () => {
    expect(buildBinsCaption(collectionStatus)).toBe(
      '\u{1F535} Blue \u00B7 recycling \u00B7 Sun 02/08 after 18:00'
    );
  });

  it('shows a concise safe error when council data is unavailable', () => {
    expect(
      buildBinsCaption({
        ...collectionStatus,
        collection: null,
        source: 'unavailable',
      })
    ).toBe('\u26A0\uFE0F Council data unavailable \u00B7 Try /bins again');
  });

  it('keeps the Sunday announcement focused on one next person and the short checklist', () => {
    expect(
      buildSundayAnnouncementCaption('Merica', 'Mon 10/08 \u2013 Sun 16/08')
    ).toBe(
      '\u{1F389} Congratulations \u00B7 next week is Merica\n🧹 Mon 10/08 \u2013 Sun 16/08\n🧼 Sink + worktops \u00B7 🧹 Vacuum + mop \u00B7 🚿 Toilets + shower \u00B7 🗑️ Bin out'
    );
  });
});
