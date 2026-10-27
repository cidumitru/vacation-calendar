// Hand-written fixtures in the shape of Nager.Date's /PublicHolidays response.
// RO 2026 lists the 16 dates of the published calendar; GB 2026 is a subset
// that exercises nationwide vs. regional (counties) holidays.
import type { NagerCountry, NagerHoliday } from '../nager';

const ro = (date: string, name: string, localName = name): NagerHoliday => ({
  date, localName, name, countryCode: 'RO', global: true, counties: null, launchYear: null, types: ['Public'],
});

export const RO_2026: NagerHoliday[] = [
  ro('2026-01-01', 'New Year’s Day', 'Anul Nou'),
  ro('2026-01-02', 'Day after New Year’s Day', 'Anul Nou'),
  ro('2026-01-06', 'Epiphany', 'Boboteaza'),
  ro('2026-01-07', 'Saint John the Baptist', 'Sfântul Ion'),
  ro('2026-01-24', 'Unification Day', 'Ziua Unirii'),
  ro('2026-04-10', 'Good Friday', 'Vinerea Mare'),
  ro('2026-04-12', 'Easter Sunday', 'Paștele'),
  ro('2026-04-13', 'Easter Monday', 'Paștele'),
  ro('2026-05-01', 'Labour Day', 'Ziua Muncii'),
  ro('2026-05-31', 'Pentecost', 'Rusaliile'),
  ro('2026-06-01', 'Children’s Day', 'Ziua Copilului'),
  ro('2026-06-01', 'Whit Monday', 'Rusaliile'),
  ro('2026-08-15', 'Assumption Day', 'Adormirea Maicii Domnului'),
  ro('2026-11-30', 'Saint Andrew’s Day', 'Sfântul Andrei'),
  ro('2026-12-01', 'National Day', 'Ziua Națională'),
  ro('2026-12-25', 'Christmas Day', 'Crăciunul'),
  ro('2026-12-26', 'Saint Stephen’s Day', 'Crăciunul'),
];

const gb = (date: string, name: string, counties: string[] | null, types: string[] = ['Public']): NagerHoliday => ({
  date, localName: name, name, countryCode: 'GB', global: counties === null, counties, launchYear: null, types,
});

export const GB_2026: NagerHoliday[] = [
  gb('2026-01-01', 'New Year’s Day', null),
  gb('2026-01-02', '2nd January', ['GB-SCT']),
  gb('2026-04-03', 'Good Friday', null),
  gb('2026-04-06', 'Easter Monday', ['GB-ENG', 'GB-WLS', 'GB-NIR']),
  gb('2026-05-04', 'Early May Bank Holiday', null),
  gb('2026-05-25', 'Spring Bank Holiday', null),
  gb('2026-08-03', 'Summer Bank Holiday', ['GB-SCT']),
  gb('2026-08-31', 'Summer Bank Holiday', ['GB-ENG', 'GB-WLS', 'GB-NIR']),
  gb('2026-11-30', 'Saint Andrew’s Day', ['GB-SCT']),
  gb('2026-12-25', 'Christmas Day', null),
  gb('2026-12-28', 'Boxing Day', null),
  gb('2026-12-31', 'New Year’s Eve', null, ['Observance']),
];

export const COUNTRIES: NagerCountry[] = [
  { countryCode: 'RO', name: 'Romania' },
  { countryCode: 'GB', name: 'United Kingdom' },
  { countryCode: 'MD', name: 'Moldova' },
  { countryCode: 'DE', name: 'Germany' },
  { countryCode: 'US', name: 'United States' },
];
