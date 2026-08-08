import type { WASocket } from '@whiskeysockets/baileys';
import type { AppConfig } from '../config';
import { formatWeekdayDayMonth } from '../lib/date';
import type {
  BinKind,
  CouncilCollectionStatus,
  DutySchedule,
  SundayAnnouncementCardData,
} from '../types/house';
import { BinCalendarService } from './binCalendarService';
import { CardRenderer } from './cardRenderer';
import { QueueService } from './queueService';
import { WelcomeStateService } from './welcomeStateService';
import {
  readPussyImage,
  readRandomPussyImage,
} from './pussyImageService';

export class HouseMateMessenger {
  constructor(
    private readonly config: AppConfig,
    private readonly queueService: QueueService,
    private readonly binCalendarService: BinCalendarService,
    private readonly cardRenderer: CardRenderer,
    private readonly welcomeStateService: WelcomeStateService
  ) {}

  public async sendStartupWelcome(
    socket: WASocket,
    groupId: string
  ): Promise<boolean> {
    if (!this.welcomeStateService.shouldSend(this.config.welcomeVersion)) {
      return false;
    }

    await this.sendWelcome(socket, groupId);
    this.welcomeStateService.markSent(this.config.welcomeVersion);
    return true;
  }

  public async sendWelcome(
    socket: WASocket,
    groupId: string,
    participantIds: string[] = []
  ): Promise<void> {
    const image = await this.cardRenderer.renderWelcomeCard({
      address: this.config.houseAddress,
      postcode: this.config.housePostcode,
    });
    const welcomeLine =
      participantIds.length > 0
        ? `\u{1F44B} Welcome ${participantIds
            .map(toMentionLabel)
            .join(', ')} to House Mate`
        : '\u{1F3E0} Welcome to House Mate';
    const caption = [
      welcomeLine,
      '\u{1F4AC} /cleaning · ♻️ /bins · /help',
    ].join('\n');

    await socket.sendMessage(groupId, {
      image,
      caption,
      mentions: participantIds,
    });

    await socket.sendMessage(groupId, {
      text: [
        '\u{2728} House Mate is ready.',
        'Use /cleaning for the rota, /bins for Sunday collection details, and /help for the quick guide.',
        '\u{1F552} Sunday preview 17:00 · rota handover 19:00.',
      ].join('\n'),
    });
  }

  public async sendCleaning(
    socket: WASocket,
    groupId: string,
    forceCouncilRefresh = false
  ): Promise<void> {
    const schedule = this.queueService.getDutySchedule();
    const collectionStatus =
      await this.binCalendarService.getNextCollection(forceCouncilRefresh);
    const image = await this.cardRenderer.renderCleaningCard({
      address: this.config.houseAddress,
      postcode: this.config.housePostcode,
      schedule,
      collectionStatus,
    });

    await socket.sendMessage(groupId, {
      image,
      caption: buildCleaningCaption(schedule),
    });
  }

  public async sendWeeklyHandover(
    socket: WASocket,
    groupId: string
  ): Promise<void> {
    await this.sendCleaning(socket, groupId, true);
  }

  public async sendSundayAnnouncement(
    socket: WASocket,
    groupId: string
  ): Promise<void> {
    const schedule = this.queueService.getDutySchedule();
    const nextPerson = schedule.next.person;
    const photoPath = this.config.memberPhotoPaths[normaliseMemberKey(nextPerson)];
    if (!photoPath) {
      throw new Error(`No member photo configured for ${nextPerson}`);
    }

    const image = await this.cardRenderer.renderSundayAnnouncementCard({
      address: this.config.houseAddress,
      postcode: this.config.housePostcode,
      person: nextPerson,
      formattedRange: schedule.next.formattedRange,
      photoPath,
    });

    await socket.sendMessage(groupId, {
      image,
      caption: buildSundayAnnouncementCaption(nextPerson, schedule.next.formattedRange),
    });

    await this.sendBins(socket, groupId, true);
  }

  public async sendMemberPhoto(
    socket: WASocket,
    groupId: string,
    personName: string
  ): Promise<void> {
    const photoPath = this.config.memberPhotoPaths[normaliseMemberKey(personName)];
    if (!photoPath) {
      throw new Error(`No member photo configured for ${personName}`);
    }

    const image = await readPussyImage(photoPath);
    await socket.sendMessage(groupId, {
      image,
      caption: buildMemberPhotoCaption(personName),
    });
  }

  public async sendBins(
    socket: WASocket,
    groupId: string,
    forceCouncilRefresh = false
  ): Promise<void> {
    const collectionStatus =
      await this.binCalendarService.getNextCollection(forceCouncilRefresh);
    const image = await this.cardRenderer.renderBinsCard({
      address: this.config.houseAddress,
      postcode: this.config.housePostcode,
      collectionStatus,
      binPhotoPath: this.config.binsImagePath,
    });

    await socket.sendMessage(groupId, {
      image,
      caption: buildBinsCaption(collectionStatus),
    });
  }

  public async sendPussy(socket: WASocket, groupId: string): Promise<void> {
    const image = await readRandomPussyImage(this.config.pussyImagePaths);
    await socket.sendMessage(groupId, {
      image,
      caption: '\u{1F4F8} Shared house photo',
    });
  }
}

export function buildMemberPhotoCaption(personName: string): string {
  if (normaliseMemberKey(personName) === 'marcin') {
    return "Didn't your mother teach you? I'll teach you.";
  }

  return `\u{1F4F8} ${personName}`;
}

export function buildCleaningCaption(schedule: DutySchedule): string {
  return [
    `🧹 NOW · ${schedule.current.person} · ${schedule.current.formattedRange}`,
    `➡️ NEXT · ${schedule.next.person} · ${schedule.next.formattedRange}`,
  ].join('\n');
}

export function buildSundayAnnouncementCaption(
  person: string,
  formattedRange: string
): string {
  return [
    `\u{1F389} Congratulations · next week is ${person}`,
    `🧹 ${formattedRange}`,
    '🧼 Sink + worktops · 🧹 Vacuum + mop · 🚿 Toilets + shower · 🗑️ Bin out',
  ].join('\n');
}

export function buildBinsCaption(status: CouncilCollectionStatus): string {
  if (!status.collection) {
    return [
      '⚠️ Council data unavailable · Try /bins again',
    ].join('\n');
  }

  const containerList = status.collection.bins
    .filter((bin) => bin !== 'food')
    .map(getAccessibleBinLabel)
    .join(' + ');
  const mainBin = status.collection.bins.find((bin) => bin !== 'food');
  const colourIcon = mainBin === 'recycling' ? '\u{1F535}' : '\u26AB';
  return [
    `${colourIcon} ${capitalise(containerList || 'check council')} · ${formatWeekdayDayMonth(
      status.collection.putOutDate
    )} after 18:00`,
  ].join('\n');
}

function getAccessibleBinLabel(bin: BinKind): string {
  if (bin === 'recycling') {
    return 'blue · recycling';
  }
  if (bin === 'residual') {
    return 'black · waste';
  }
  return 'check council';
}

function toMentionLabel(participantId: string): string {
  return `@${participantId.split('@')[0]}`;
}

function normaliseMemberKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function capitalise(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
