import type { WASocket } from '@whiskeysockets/baileys';
import type { AppConfig } from '../config';
import { formatWeekdayDayMonth } from '../lib/date';
import type {
  BinKind,
  CouncilCollectionStatus,
  DutySchedule,
} from '../types/house';
import { BinCalendarService } from './binCalendarService';
import { CardRenderer } from './cardRenderer';
import { QueueService } from './queueService';
import { WelcomeStateService } from './welcomeStateService';
import { readPussyImage } from './pussyImageService';

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
            .join(', ')} to ${this.config.houseAddress}`
        : `\u{1F3E0} Welcome to ${this.config.houseAddress}`;
    const caption = [
      welcomeLine,
      '\u{1F4AC} Chat here · \u{1F9F9} /cleaning · ♻️ /bins · \u{1F4F8} /pussy',
    ].join('\n');

    await socket.sendMessage(groupId, {
      image,
      caption,
      mentions: participantIds,
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
    });

    await socket.sendMessage(groupId, {
      image,
      caption: buildBinsCaption(collectionStatus),
    });
  }

  public async sendPussy(socket: WASocket, groupId: string): Promise<void> {
    const image = await readPussyImage(this.config.pussyImagePath);
    await socket.sendMessage(groupId, {
      image,
      caption: '\u{1F4F8} Shared house photo',
    });
  }
}

export function buildCleaningCaption(schedule: DutySchedule): string {
  return `🧹 ${schedule.current.person} is on duty · ${schedule.current.formattedRange}`;
}

export function buildBinsCaption(status: CouncilCollectionStatus): string {
  if (!status.collection) {
    return '⚠️ Council data unavailable · Try /bins again shortly';
  }

  const containerList = status.collection.bins
    .map(getAccessibleBinLabel)
    .join(' + ');
  return `♻️ ${capitalise(containerList)} · Put out ${formatWeekdayDayMonth(
    status.collection.putOutDate
  )} after 18:00`;
}

function getAccessibleBinLabel(bin: BinKind): string {
  if (bin === 'recycling') {
    return 'blue recycling bin';
  }
  if (bin === 'residual') {
    return 'black/grey residual bin';
  }
  return 'food caddy';
}

function toMentionLabel(participantId: string): string {
  return `@${participantId.split('@')[0]}`;
}

function capitalise(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
