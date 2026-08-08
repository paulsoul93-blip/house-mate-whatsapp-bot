import {
  isTargetGroupMessage,
  shouldProcessMessageUpsert,
} from '../bot/messageScope';

describe('isTargetGroupMessage', () => {
  const targetGroupId = '120363000000000000@g.us';

  it('accepts a message from the configured WhatsApp group', () => {
    expect(isTargetGroupMessage(targetGroupId, targetGroupId)).toBe(true);
  });

  it('rejects a message from another chat or group', () => {
    expect(isTargetGroupMessage('120363111111111111@g.us', targetGroupId)).toBe(false);
    expect(isTargetGroupMessage('447700900000@s.whatsapp.net', targetGroupId)).toBe(false);
  });

  it('rejects messages when either group identifier is missing', () => {
    expect(isTargetGroupMessage(null, targetGroupId)).toBe(false);
    expect(isTargetGroupMessage(targetGroupId, null)).toBe(false);
    expect(isTargetGroupMessage(undefined, targetGroupId)).toBe(false);
  });

  it('accepts live notifications from all group participants', () => {
    expect(shouldProcessMessageUpsert('notify', false, null, 1_000_000)).toBe(true);
    expect(shouldProcessMessageUpsert('notify', true, null, 1_000_000)).toBe(true);
  });

  it('accepts a recent append synchronized from the owner phone', () => {
    expect(shouldProcessMessageUpsert('append', true, 950_000, 1_000_000)).toBe(true);
  });

  it('rejects history replays and append events from other participants', () => {
    expect(shouldProcessMessageUpsert('append', false, 990_000, 1_000_000)).toBe(false);
    expect(shouldProcessMessageUpsert('append', true, 800_000, 1_000_000)).toBe(false);
  });
});
