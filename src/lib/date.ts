import moment from 'moment-timezone';
import type { IsoDate } from '../types/house';

const ISO_DATE_FORMAT = 'YYYY-MM-DD';

export function toIsoDate(value: string): IsoDate {
  const parsed = moment(value, ISO_DATE_FORMAT, true);
  if (!parsed.isValid()) {
    throw new Error('Invalid ISO date');
  }
  return parsed.format(ISO_DATE_FORMAT) as IsoDate;
}

export function getLocalDate(date: Date, timeZone: string): IsoDate {
  return moment(date).tz(timeZone).format(ISO_DATE_FORMAT) as IsoDate;
}

export function getLocalWeekStart(date: Date, timeZone: string): IsoDate {
  return moment(date).tz(timeZone).startOf('isoWeek').format(ISO_DATE_FORMAT) as IsoDate;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return moment.utc(date, ISO_DATE_FORMAT, true).add(days, 'days').format(ISO_DATE_FORMAT) as IsoDate;
}

export function differenceInWeeks(from: IsoDate, to: IsoDate): number {
  return Math.max(
    0,
    Math.floor(
      moment.utc(to, ISO_DATE_FORMAT, true).diff(
        moment.utc(from, ISO_DATE_FORMAT, true),
        'days'
      ) / 7
    )
  );
}

export function formatDayMonth(date: IsoDate): string {
  return moment.utc(date, ISO_DATE_FORMAT, true).format('DD/MM');
}

export function formatWeekdayDayMonth(date: IsoDate): string {
  return moment
    .utc(date, ISO_DATE_FORMAT, true)
    .locale('en')
    .format('ddd DD/MM');
}

export function formatDateRange(startDate: IsoDate, endDate: IsoDate): string {
  return `${formatWeekdayDayMonth(startDate)} – ${formatWeekdayDayMonth(
    endDate
  )}`;
}

export function formatLongDate(date: IsoDate): string {
  return moment.utc(date, ISO_DATE_FORMAT, true).format('dddd, D MMMM');
}
