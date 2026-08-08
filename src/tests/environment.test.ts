import { parseEnvironment } from '../lib/environment';

describe('parseEnvironment', () => {
  const validEnvironment = {
    PORT: '3000',
    WA_GROUP_NAME: 'House Mate App',
    WA_GROUP_ID: '120363428121220076@g.us',
    HTTP_HOST: '127.0.0.1',
    DUTY_MEMBERS: 'Pawel,Merica,Ozgur,Kamil',
    SCHEDULE_CRON: '0 19 * * 0',
    SCHEDULE_TIMEZONE: 'Europe/London',
    DATA_DIR: './data',
    HOUSE_ADDRESS: '19 Silver Birch Close',
    HOUSE_POSTCODE: 'PE29 7BW',
    COUNCIL_CALENDAR_URL:
      'https://servicelayer3c.azure-api.net/wastecalendar/calendar/ical/100090117435?authority=HDC&take=20',
    COUNCIL_SOURCE_URL:
      'https://www.huntingdonshire.gov.uk/refuse-calendar/results?uprn=100090117435',
    WELCOME_VERSION: 'welcome-v1',
  };

  it('validates and normalises configuration', () => {
    const config = parseEnvironment(validEnvironment);

    expect(config.port).toBe(3000);
    expect(config.dutyMembers).toEqual(['Pawel', 'Merica', 'Ozgur', 'Kamil']);
    expect(config.housePostcode).toBe('PE29 7BW');
    expect(config.groupId).toBe('120363428121220076@g.us');
    expect(config.httpHost).toBe('127.0.0.1');
  });

  it('rejects an invalid council endpoint', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        COUNCIL_CALENDAR_URL: 'not-a-url',
      })
    ).toThrow('Invalid application configuration');
  });
});
