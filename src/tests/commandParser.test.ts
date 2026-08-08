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

  it('recognises the shared photo command', () => {
    expect(parseHouseCommand('/pussy')).toEqual({
      name: 'pussy',
      args: [],
    });
    expect(parseHouseCommand('/cipa')).toEqual({
      name: 'pussy',
      args: [],
    });
  });

  it('recognises the owner test command for the Sunday handover', () => {
    expect(parseHouseCommand('/testweekly')).toEqual({
      name: 'test-weekly',
      args: [],
    });
    expect(parseHouseCommand('/test-weekly')).toEqual({
      name: 'test-weekly',
      args: [],
    });
  });

  it('recognises the hidden member photo shortcuts', () => {
    expect(parseHouseCommand('/paweł')).toEqual({
      name: 'member-photo',
      args: ['Pawel'],
    });
    expect(parseHouseCommand('/kamil')).toEqual({
      name: 'member-photo',
      args: ['Kamil'],
    });
    expect(parseHouseCommand('/marcin')).toEqual({
      name: 'member-photo',
      args: ['Marcin'],
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
