import type { proto } from '@whiskeysockets/baileys';

const MAX_MESSAGE_WRAPPER_DEPTH = 5;

function unwrapMessageContent(message: proto.IMessage): proto.IMessage {
  let currentMessage = message;

  for (let depth = 0; depth < MAX_MESSAGE_WRAPPER_DEPTH; depth += 1) {
    const wrappedMessage =
      currentMessage.ephemeralMessage?.message ??
      currentMessage.viewOnceMessage?.message ??
      currentMessage.documentWithCaptionMessage?.message ??
      currentMessage.viewOnceMessageV2?.message ??
      currentMessage.viewOnceMessageV2Extension?.message ??
      currentMessage.editedMessage?.message;

    if (!wrappedMessage) {
      break;
    }

    currentMessage = wrappedMessage;
  }

  return currentMessage;
}

export function extractCommandText(message: proto.IMessage | null | undefined): string {
  if (!message) {
    return '';
  }

  const normalizedMessage = unwrapMessageContent(message);

  return (
    normalizedMessage?.conversation ??
    normalizedMessage?.extendedTextMessage?.text ??
    normalizedMessage?.imageMessage?.caption ??
    normalizedMessage?.videoMessage?.caption ??
    ''
  );
}
