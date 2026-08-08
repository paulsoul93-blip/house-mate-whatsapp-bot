export type HouseCommandName =
  | 'cleaning'
  | 'bins'
  | 'pussy'
  | 'member-photo'
  | 'welcome'
  | 'test-weekly'
  | 'test-sunday'
  | 'next'
  | 'previous'
  | 'skip'
  | 'set-duty';

export interface HouseCommand {
  name: HouseCommandName;
  args: string[];
}

const COMMAND_ALIASES: Readonly<Record<string, HouseCommandName>> = {
  '/cleaning': 'cleaning',
  '/bins': 'bins',
  '/pussy': 'pussy',
  '/cipa': 'pussy',
  '/test': 'test-sunday',
  '/test-sunday': 'test-sunday',
  '/testweekly': 'test-weekly',
  '/test-weekly': 'test-weekly',
  '/help': 'welcome',
  '!cleaning': 'cleaning',
  '!duty': 'cleaning',
  '!kolejka': 'cleaning',
  '!grafik': 'cleaning',
  '!help': 'welcome',
  '!status': 'welcome',
  '!testweekly': 'test-weekly',
  '!next': 'next',
  '!nastepny': 'next',
  '!prev': 'previous',
  '!poprzedni': 'previous',
  '!skip': 'skip',
  '!pomin': 'skip',
  '!setduty': 'set-duty',
};

const MEMBER_PHOTO_ALIASES: Readonly<Record<string, string>> = {
  '/pawel': 'Pawel',
  '/paweł': 'Pawel',
  '/merica': 'Merica',
  '/ozgur': 'Ozgur',
  '/kamil': 'Kamil',
};

export function parseHouseCommand(text: string): HouseCommand | null {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const rawCommand = parts[0]?.toLowerCase();
  if (!rawCommand) {
    return null;
  }

  const commandWithoutMention = rawCommand.split('@')[0];
  const memberName = MEMBER_PHOTO_ALIASES[commandWithoutMention];
  if (memberName) {
    return {
      name: 'member-photo',
      args: [memberName, ...parts.slice(1)],
    };
  }

  const name = COMMAND_ALIASES[commandWithoutMention];
  if (!name) {
    return null;
  }

  return {
    name,
    args: parts.slice(1),
  };
}
