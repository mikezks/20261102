export function addMinutes(date: Date, minutes: number, returnTypeDateObject: true): Date;
export function addMinutes(date: string, minutes: number, returnTypeDateObject: true): Date;
export function addMinutes(date: Date, minutes: number, returnTypeDateObject?: false): string;
export function addMinutes(date: string, minutes: number, returnTypeDateObject?: false): string;
export function addMinutes(
  date: Date | string,
  minutes: number,
  returnTypeDateObject: boolean | undefined = false,
): Date | string {
  const inputDate = date instanceof Date ? date : new Date(date);
  const updatedDate = new Date(inputDate.getTime() + minutes * 60 * 1_000);

  return returnTypeDateObject ? updatedDate : updatedDate.toISOString();
}

/** Format an absolute timestamp in an explicit IANA zone, including its date-specific offset. */
export function formatZonedDateTime(value: string, timeZone: string): string {
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) || !Number.isFinite(Date.parse(value))) {
    return 'Time unavailable (invalid or missing UTC offset)';
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(value));

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const offset = part('timeZoneName').replace('GMT', 'UTC').replace(/^UTC$/, 'UTC+00:00');

  return `${part('day')}.${part('month')}.${part('year')} ${part('hour')}:${part('minute')} (${timeZone}, ${offset})`;
}
