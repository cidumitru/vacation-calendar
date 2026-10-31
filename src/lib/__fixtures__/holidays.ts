// Hand-written fixtures in the app's own Holiday shape. RO 2026 lists the 16 dates of the
// published calendar (two holidays share 1 June); RO_2026_ALL adds the observances the rules
// also know, which must not count as days off.
import type { Holiday } from '../holidays';

const ro = (date: string, name: string, type: Holiday['type'] = 'public'): Holiday => ({ date, name, type });

export const RO_2026: Holiday[] = [
  ro('2026-01-01', 'New Year’s Day'),
  ro('2026-01-02', 'Day after New Year’s Day'),
  ro('2026-01-06', 'Epiphany'),
  ro('2026-01-07', 'Saint John the Baptist'),
  ro('2026-01-24', 'Unification Day'),
  ro('2026-04-10', 'Good Friday'),
  ro('2026-04-12', 'Easter Sunday'),
  ro('2026-04-13', 'Easter Monday'),
  ro('2026-05-01', 'Labour Day'),
  ro('2026-05-31', 'Pentecost'),
  ro('2026-06-01', 'Children’s Day'),
  ro('2026-06-01', 'Whit Monday'),
  ro('2026-08-15', 'Assumption Day'),
  ro('2026-11-30', 'Saint Andrew’s Day'),
  ro('2026-12-01', 'National Day'),
  ro('2026-12-25', 'Christmas Day'),
  ro('2026-12-26', 'Saint Stephen’s Day'),
];

export const RO_2026_ALL: Holiday[] = [
  ...RO_2026,
  ro('2026-03-08', 'Mother’s Day', 'observance'),
  ro('2026-06-26', 'Flag Day', 'observance'),
  ro('2026-12-08', 'Constitution Day', 'observance'),
];
