import {
  findNextCollection,
  parseCouncilCalendar,
} from '../services/binCalendarService';

const VALID_CALENDAR = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260803T060000Z
SUMMARY: Recycling
END:VEVENT
BEGIN:VEVENT
DTSTART:20260803T060000Z
SUMMARY:Food Waste
END:VEVENT
BEGIN:VEVENT
DTSTART:20260810T060000Z
SUMMARY:Normal Waste
END:VEVENT
END:VCALENDAR`;

describe('Huntingdonshire council calendar', () => {
  it('parses and groups collection types by date', () => {
    expect(parseCouncilCalendar(VALID_CALENDAR)).toEqual([
      {
        collectionDate: '2026-08-03',
        bins: ['recycling', 'food'],
      },
      {
        collectionDate: '2026-08-10',
        bins: ['residual'],
      },
    ]);
  });

  it('returns the next collection and Sunday put-out date', () => {
    const result = findNextCollection(
      parseCouncilCalendar(VALID_CALENDAR),
      '2026-07-31'
    );

    expect(result).toEqual({
      collectionDate: '2026-08-03',
      putOutDate: '2026-08-02',
      bins: ['recycling', 'food'],
    });
  });

  it('returns null when no future collection is available', () => {
    expect(
      findNextCollection(parseCouncilCalendar(VALID_CALENDAR), '2026-08-11')
    ).toBeNull();
  });

  it('rejects a response that is not an iCalendar', () => {
    expect(() => parseCouncilCalendar('<html>Service unavailable</html>')).toThrow(
      'Invalid council calendar response'
    );
  });
});
