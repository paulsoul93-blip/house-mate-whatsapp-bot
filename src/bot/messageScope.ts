export function isTargetGroupMessage(
  remoteJid: string | null | undefined,
  targetGroupId: string | null
): boolean {
  return targetGroupId !== null && remoteJid === targetGroupId;
}

export type SupportedMessageUpsertType = 'append' | 'notify';

const MAX_SYNCHRONIZED_MESSAGE_AGE_MS = 120_000;
const MAX_CLOCK_SKEW_MS = 30_000;

export function shouldProcessMessageUpsert(
  upsertType: SupportedMessageUpsertType,
  fromMe: boolean | null | undefined,
  messageTimestampMs: number | null,
  nowMs: number = Date.now()
): boolean {
  if (upsertType === 'notify') {
    return true;
  }

  if (!fromMe || messageTimestampMs === null) {
    return false;
  }

  const ageMs = nowMs - messageTimestampMs;
  return ageMs >= -MAX_CLOCK_SKEW_MS && ageMs <= MAX_SYNCHRONIZED_MESSAGE_AGE_MS;
}
