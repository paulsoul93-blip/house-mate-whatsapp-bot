export type HouseCommandName =
  | 'cleaning'
  | 'bins'
  | 'welcome'
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
  '/help': 'welcome',
  '!cleaning': 'cleaning',
  '!duty': 'cleaning',
  '!kolejka': 'cleaning',
  '!grafik': 'cleaning',
  '!help': 'welcome',
  '!status': 'welcome',
  '!next': 'next',
  '!nastepny': 'next',
  '!prev': 'previous',
  '!poprzedni': 'previous',
  '!skip': 'skip',
  '!pomin': 'skip',
  '!setduty': 'set-duty',
};

export function parseHouseCommand(text: string): HouseCommand | null {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const rawCommand = parts[0]?.toLowerCase();
  if (!rawCommand) {
    return null;
  }

  const commandWithoutMention = rawCommand.split('@')[0];
  const name = COMMAND_ALIASES[commandWithoutMention];
  if (!name) {
    return null;
  }

  return {
    name,
    args: parts.slice(1),
  };
}
