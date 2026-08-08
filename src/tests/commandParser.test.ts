import { parseHouseCommand } from '../bot/commandParser';

describe('parseHouseCommand', () => {
  it('recognises the two public slash commands', () => {
    expect(parseHouseCommand('/cleaning')).toEqual({
      name: 'cleaning',
      args: [],
    });
    expect(parseHouseCommand('/bins')).toEqual({
      name: 'bins',
      args: [],
    });
  });

  it('accepts a WhatsApp command suffix and normalises casing', () => {
    expect(parseHouseCommand('/CLEANING@HouseMateBot')).toEqual({
      name: 'cleaning',
      args: [],
    });
  });

  it('keeps supported legacy commands as English aliases', () => {
    expect(parseHouseCommand('!duty')).toEqual({
      name: 'cleaning',
      args: [],
    });
    expect(parseHouseCommand('!help')).toEqual({
      name: 'welcome',
      args: [],
    });
  });

  it('ignores ordinary conversation and unsupported commands', () => {
    expect(parseHouseCommand('hello housemates')).toBeNull();
    expect(parseHouseCommand('/unknown')).toBeNull();
  });
});
