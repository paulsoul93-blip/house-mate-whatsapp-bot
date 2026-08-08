import { proto } from '@whiskeysockets/baileys';
import { extractCommandText } from '../bot/messageContent';

describe('extractCommandText', () => {
  it('extracts a plain conversation command', () => {
    const message: proto.IMessage = { conversation: '!status' };

    expect(extractCommandText(message)).toBe('!status');
  });

  it('extracts an extended text command', () => {
    const message: proto.IMessage = {
      extendedTextMessage: { text: '!help' },
    };

    expect(extractCommandText(message)).toBe('!help');
  });

  it('unwraps an ephemeral command message', () => {
    const message: proto.IMessage = {
      ephemeralMessage: {
        message: {
          extendedTextMessage: { text: '!duty' },
        },
      },
    };

    expect(extractCommandText(message)).toBe('!duty');
  });

  it('returns an empty string when the message has no supported text', () => {
    expect(extractCommandText({ imageMessage: {} })).toBe('');
  });
});
