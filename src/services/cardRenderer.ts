import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  CookingPot,
  Droplets,
  House,
  MessageCircle,
  ShowerHead,
  Sparkles,
  Trash2,
  Wind,
} from 'lucide-static';
import { formatDayMonth, formatLongDate } from '../lib/date';
import type {
  BinsCardData,
  BinKind,
  CleaningCardData,
  CouncilCollectionStatus,
  WelcomeCardData,
} from '../types/house';

const WIDTH = 1080;
const HEIGHT = 1350;
const FONT_FAMILY = "'Segoe UI', Inter, sans-serif";

const COLORS = {
  background: '#060914',
  panel: '#0E1424',
  panelStrong: '#121B30',
  foreground: '#F7F9FC',
  muted: '#8E9AB3',
  border: '#FFFFFF1A',
  primary: '#55A7FF',
  accent: '#48E0C2',
  blueBin: '#2787F5',
  residualBin: '#727B8A',
  foodBin: '#C8D0DA',
  warning: '#F4B860',
};

export const HOUSE_CLEANING_TASKS = [
  'Wash the kitchen sink and worktops',
  'Vacuum the kitchen, then mop the floor',
  'Clean toilets, bathrooms and shower area',
] as const;

export class CardRenderer {
  public async renderWelcomeCard(data: WelcomeCardData): Promise<Buffer> {
    const body = `
      ${this.header(data.address, data.postcode, 'HOUSEHOLD SPACE')}
      <text x="72" y="250" class="display">Welcome home.</text>
      <text x="72" y="308" class="body muted">This is the private group for everyone living at</text>
      <text x="72" y="352" class="body">${escapeXml(data.address)}.</text>

      ${this.depthPanel(72, 420, 936, 200, 28, 'panelStrong', COLORS.accent)}
      ${icon(MessageCircle, 112, 462, 44, COLORS.accent)}
      <text x="180" y="484" class="section">Stay connected</text>
      <text x="112" y="548" class="body muted">Chat with your housemates, check the cleaning rota</text>
      <text x="112" y="588" class="body muted">and keep up with shared home information.</text>

      <text x="72" y="706" class="eyebrow">KEY COMMANDS</text>
      ${this.commandPanel(
        72,
        744,
        '/cleaning',
        'Current duty, dates, next person and the full checklist',
        Sparkles,
        COLORS.primary
      )}
      ${this.commandPanel(
        72,
        930,
        '/bins',
        'Next council collection and what to put out on Sunday',
        Trash2,
        COLORS.accent
      )}

      ${this.depthPanel(72, 1164, 936, 98, 24, 'panel', COLORS.muted)}
      ${icon(Clock3, 108, 1191, 38, COLORS.muted)}
      <text x="168" y="1208" class="small">SUNDAY HANDOVER  ·  19:00</text>
      <text x="168" y="1238" class="meta">Fresh rota, council data and house notes</text>
    `;

    return this.renderSvg(this.frame(body));
  }

  public async renderCleaningCard(data: CleaningCardData): Promise<Buffer> {
    const binTask = getBinTask(data.collectionStatus);
    const body = `
      ${this.header(data.address, data.postcode, 'WEEKLY HOUSE CARE')}
      <text x="72" y="234" class="display">Cleaning rota</text>

      ${this.depthGradientPanel(72, 292, 604, 244, 30, 'url(#primaryPanel)', COLORS.primary)}
      <text x="112" y="344" class="eyebrow light">ON DUTY NOW</text>
      <text x="112" y="426" class="heroName">${escapeXml(
        data.schedule.current.person
      )}</text>
      ${icon(CalendarDays, 112, 464, 34, COLORS.foreground)}
      <text x="164" y="490" class="date light">${escapeXml(
        data.schedule.current.formattedRange
      )}</text>

      ${this.depthPanel(700, 292, 308, 244, 30, 'panelStrong', COLORS.accent)}
      <text x="736" y="344" class="eyebrow">NEXT</text>
      <text x="736" y="412" class="nextName">${escapeXml(
        data.schedule.next.person
      )}</text>
      ${icon(ArrowRight, 736, 452, 30, COLORS.accent)}
      <text x="782" y="476" class="nextDate">${escapeXml(
        data.schedule.next.formattedRange
      )}</text>

      <text x="72" y="622" class="eyebrow">THIS WEEK'S CHECKLIST</text>
      ${this.depthPanel(72, 660, 936, 420, 30, 'panel', COLORS.accent)}
      ${this.taskRow(112, 714, CookingPot, HOUSE_CLEANING_TASKS[0])}
      ${this.taskRow(112, 804, Wind, HOUSE_CLEANING_TASKS[1])}
      ${this.taskRow(112, 894, ShowerHead, HOUSE_CLEANING_TASKS[2])}
      ${this.taskRow(112, 984, Trash2, binTask, getBinAccent(data.collectionStatus), 23)}

      ${this.depthPanel(72, 1120, 936, 142, 28, 'panel', COLORS.accent)}
      ${icon(Clock3, 112, 1158, 36, COLORS.accent)}
      <text x="168" y="1182" class="sectionSmall">Sunday handover at 19:00</text>
      <text x="168" y="1224" class="small">Complete the list before the next rota begins.</text>
    `;

    return this.renderSvg(this.frame(body));
  }

  public async renderBinsCard(data: BinsCardData): Promise<Buffer> {
    const binPhoto = await readOptionalImageDataUri(data.binPhotoPath);
    const collection = data.collectionStatus.collection;
    const mainBin = collection?.bins.find((bin) => bin !== 'food') ?? null;
    const binAccent = getBinAccent(data.collectionStatus);
    const title = mainBin ? getBinLabel(mainBin) : 'COLLECTION STATUS';
    const collectionDate = collection
      ? formatLongDate(collection.collectionDate)
      : 'No upcoming collection available';
    const putOutText = collection
      ? `Put out after 18:00 on ${formatLongDate(collection.putOutDate)}`
      : 'Council calendar data is temporarily unavailable';
    const foodText = collection?.bins.includes('food')
      ? 'Food caddy is collected on the same day'
      : 'No food collection listed for this date';

    const body = `
      ${this.header(data.address, data.postcode, 'COUNCIL COLLECTION')}
      <text x="72" y="234" class="display">Bin collection</text>

      ${this.depthGradientPanel(72, 302, 936, 390, 34, 'url(#binPanel)', binAccent)}
      ${binPhoto
        ? `<rect x="112" y="350" width="220" height="246" rx="30" fill="#07101F" stroke="${binAccent}88"/><image href="${binPhoto}" x="114" y="352" width="216" height="242" preserveAspectRatio="xMidYMid slice" clip-path="url(#binPhotoClip)"/>`
        : `<rect x="112" y="350" width="164" height="246" rx="30" fill="${binAccent}"/>${icon(Trash2, 154, 412, 80, COLORS.foreground)}`}
      <text x="360" y="376" class="eyebrow light">NEXT COLLECTION</text>
      <text x="360" y="444" class="binTitle">${escapeXml(title)}</text>
      <text x="360" y="516" class="section">${escapeXml(collectionDate)}</text>
      <text x="360" y="574" class="small light">${escapeXml(foodText)}</text>
      <text x="360" y="624" class="small light">${escapeXml(putOutText)}</text>

      <text x="72" y="780" class="eyebrow">WHAT TO DO</text>
      ${this.depthPanel(72, 818, 936, 282, 30, 'panel', binAccent)}
      ${this.taskRow(112, 874, Clock3, 'Do not put bins out before 18:00 the day before', COLORS.accent, 26)}
      ${this.taskRow(112, 962, CircleCheck, 'Place the correct bin at the collection point', binAccent, 26)}
      ${this.taskRow(112, 1048, Droplets, 'Return bins after they have been emptied', COLORS.accent, 26)}

      ${this.depthPanel(72, 1130, 936, 132, 28, 'panel', binAccent)}
      ${icon(CalendarDays, 112, 1168, 36, COLORS.muted)}
      <text x="168" y="1189" class="sectionSmall">Huntingdonshire District Council</text>
      <text x="168" y="1231" class="small">Live calendar with a safe local fallback.</text>
    `;

    return this.renderSvg(this.frame(body, binAccent));
  }

  private depthPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    className: string,
    accent: string
  ): string {
    return `
      <rect x="${x + 6}" y="${y + 12}" width="${width}" height="${height}" rx="${radius}" fill="#00030A" opacity=".68"/>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" class="${className}"/>
      <path d="M ${x + radius} ${y + 1} H ${x + width - radius}" stroke="#FFFFFF" stroke-opacity=".16" stroke-width="2" stroke-linecap="round"/>
      <path d="M ${x + 2} ${y + radius} V ${y + height - radius}" stroke="${accent}" stroke-opacity=".22" stroke-width="2" stroke-linecap="round"/>
    `;
  }

  private depthGradientPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
    accent: string
  ): string {
    return `
      <rect x="${x + 6}" y="${y + 12}" width="${width}" height="${height}" rx="${radius}" fill="#00030A" opacity=".68"/>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${accent}88" stroke-width="2"/>
      <path d="M ${x + radius} ${y + 1} H ${x + width - radius}" stroke="#FFFFFF" stroke-opacity=".18" stroke-width="2" stroke-linecap="round"/>
      <path d="M ${x + 2} ${y + radius} V ${y + height - radius}" stroke="${accent}" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>
    `;
  }

  private commandPanel(
    x: number,
    y: number,
    command: string,
    description: string,
    iconSvg: string,
    accent: string
  ): string {
    return `
      ${this.depthPanel(x, y, 936, 154, 28, 'panel', accent)}
      <rect x="${x + 32}" y="${y + 32}" width="90" height="90" rx="24" fill="${accent}22" stroke="${accent}55"/>
      ${icon(iconSvg, x + 55, y + 55, 44, accent)}
      <text x="${x + 154}" y="${y + 67}" class="command">${escapeXml(command)}</text>
      <text x="${x + 154}" y="${y + 112}" class="small">${escapeXml(
        description
      )}</text>
      ${icon(ArrowRight, x + 870, y + 62, 30, COLORS.muted)}
    `;
  }

  private taskRow(
    x: number,
    y: number,
    iconSvg: string,
    label: string,
    accent: string = COLORS.accent,
    fontSize: number = 28
  ): string {
    return `
      <circle cx="${x + 22}" cy="${y + 18}" r="22" fill="${accent}20" stroke="${accent}55"/>
      ${icon(iconSvg, x + 10, y + 6, 24, accent)}
      <text x="${x + 68}" y="${y + 28}" class="task" font-size="${fontSize}px">${escapeXml(label)}</text>
    `;
  }

  private header(address: string, postcode: string, badge: string): string {
    return `
      <rect x="72" y="66" width="64" height="64" rx="20" fill="#55A7FF22" stroke="#55A7FF66"/>
      ${icon(House, 88, 82, 32, COLORS.primary)}
      <text x="160" y="94" class="brand">19 SILVER BIRCH CLOSE</text>
      <text x="160" y="126" class="meta">${escapeXml(
        `${address} • ${postcode}`
      )}</text>
      <rect x="778" y="77" width="230" height="42" rx="21" fill="#FFFFFF0A" stroke="${
        COLORS.border
      }"/>
      <text x="893" y="104" class="badge" text-anchor="middle">${escapeXml(
        badge
      )}</text>
    `;
  }

  private frame(body: string, accent: string = COLORS.primary): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
        <defs>
          <clipPath id="binPhotoClip"><rect x="112" y="350" width="220" height="246" rx="30"/></clipPath>
          <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(920 120) rotate(135) scale(520)">
            <stop stop-color="${accent}" stop-opacity=".18"/>
            <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="primaryPanel" x1="72" y1="292" x2="676" y2="536" gradientUnits="userSpaceOnUse">
            <stop stop-color="#287BD8"/>
            <stop offset="1" stop-color="#1250A5"/>
          </linearGradient>
          <linearGradient id="binPanel" x1="72" y1="302" x2="1008" y2="692" gradientUnits="userSpaceOnUse">
            <stop stop-color="${accent}" stop-opacity=".24"/>
            <stop offset=".55" stop-color="#121B30"/>
            <stop offset="1" stop-color="#0E1424"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity=".42"/>
          </filter>
        </defs>
        <style>
          text { font-family: ${FONT_FAMILY}; fill: ${COLORS.foreground}; }
          .display { font-size: 72px; font-weight: 700; letter-spacing: -2px; }
          .brand { font-size: 21px; font-weight: 700; letter-spacing: 2px; }
          .meta { font-size: 18px; font-weight: 500; fill: ${COLORS.muted}; }
          .badge, .eyebrow { font-size: 17px; font-weight: 700; letter-spacing: 2px; fill: ${COLORS.muted}; }
          .light { fill: #EAF4FF; }
          .body { font-size: 32px; font-weight: 500; }
          .muted, .small { fill: ${COLORS.muted}; }
          .section { font-size: 34px; font-weight: 650; }
          .sectionSmall { font-size: 26px; font-weight: 650; }
          .small { font-size: 24px; font-weight: 500; }
          .command { font-size: 40px; font-weight: 700; letter-spacing: -.5px; }
          .heroName { font-size: 80px; font-weight: 750; letter-spacing: -2px; }
          .nextName { font-size: 47px; font-weight: 700; letter-spacing: -1px; }
          .date { font-size: 29px; font-weight: 650; font-variant-numeric: tabular-nums; }
          .nextDate { font-size: 23px; font-weight: 600; fill: ${COLORS.muted}; font-variant-numeric: tabular-nums; }
          .task { font-size: 28px; font-weight: 550; }
          .binTitle { font-size: 44px; font-weight: 750; letter-spacing: -1px; }
          .panel { fill: ${COLORS.panel}; stroke: ${COLORS.border}; filter: url(#shadow); }
          .panelStrong { fill: ${COLORS.panelStrong}; stroke: ${COLORS.border}; filter: url(#shadow); }
        </style>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.background}"/>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
        <circle cx="90" cy="1280" r="250" fill="${COLORS.accent}" opacity=".035"/>
        ${body}
      </svg>
    `;
  }

  private async renderSvg(svg: string): Promise<Buffer> {
    return sharp(Buffer.from(svg))
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer();
  }
}

function icon(
  svg: string,
  x: number,
  y: number,
  size: number,
  color: string
): string {
  const innerSvg = svg
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')
    .replace(/style="[^"]*"/g, '');
  const scale = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${innerSvg}</g>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function readOptionalImageDataUri(
  imagePath: string
): Promise<string | null> {
  try {
    const image = await readFile(imagePath);
    return `data:image/png;base64,${image.toString('base64')}`;
  } catch {
    return null;
  }
}

function getBinAccent(status: CouncilCollectionStatus): string {
  const mainBin = status.collection?.bins.find((bin) => bin !== 'food');
  if (mainBin === 'recycling') {
    return COLORS.blueBin;
  }
  if (mainBin === 'residual') {
    return COLORS.residualBin;
  }
  if (status.collection?.bins.includes('food')) {
    return COLORS.foodBin;
  }
  return COLORS.warning;
}

function getBinLabel(bin: BinKind): string {
  if (bin === 'recycling') {
    return 'BLUE RECYCLING BIN';
  }
  if (bin === 'residual') {
    return 'BLACK / GREY RESIDUAL BIN';
  }
  return 'FOOD CADDY';
}

function getBinTask(status: CouncilCollectionStatus): string {
  const collection = status.collection;
  if (!collection) {
    return 'Check /bins — council collection data is unavailable';
  }

  const mainBin = collection.bins.find((bin) => bin !== 'food');
  const parts = mainBin ? [getBinLabel(mainBin)] : [];
  if (collection.bins.includes('food')) {
    parts.push('FOOD CADDY');
  }
  return `Put out ${parts.join(' + ')} after 18:00 on ${formatDayMonth(
    collection.putOutDate
  )}`;
}
