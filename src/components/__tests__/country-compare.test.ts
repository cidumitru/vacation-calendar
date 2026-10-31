import { describe, expect, it } from 'vitest';
import { compareBand, compareCounts, compareNote, compareState, compareTip } from '../country-compare';
import type { DayCell } from '@/lib/calendar';
import type { OtherCountry } from '@/lib/holidays';

const day = (key: string, holiday: string, others: DayCell['others'], kind: DayCell['kind'] = holiday ? 'holiday' : 'plain'): DayCell => ({
  n: Number(key.slice(8)),
  key,
  kind,
  color: null,
  end: false,
  picked: false,
  joinLeft: false,
  joinRight: false,
  holiday,
  others,
  value: 0,
  best: null,
  heat: 0,
  aria: '',
});
const de = (holiday: string) => ({ code: 'DE', name: 'Germany', holiday });

describe('Who is off on a day', () => {
  it('tells yours, theirs and both apart', () => {
    expect(compareState(day('2026-06-01', 'Whit Monday', []))).toBe('mine');
    expect(compareState(day('2026-05-25', '', [de('Whit Monday')]))).toBe('theirs');
    expect(compareState(day('2026-05-01', 'Labour Day', [de('Labour Day')]))).toBe('both');
    expect(compareState(day('2026-05-04', '', []))).toBe('none');
  });

  it('words the tooltip by who is off and whether the names agree', () => {
    expect(compareTip(day('2026-05-01', 'Labour Day', [de('Labour Day')]), 'Romania')).toBe('Labour Day · Romania and Germany');
    expect(compareTip(day('2026-12-26', 'Saint Stephen’s Day', [de('Boxing Day')]), 'Romania')).toBe('Saint Stephen’s Day (Romania) · Boxing Day (Germany)');
    expect(compareTip(day('2026-06-01', 'Whit Monday', []), 'Romania')).toBe('Whit Monday · Romania only');
    expect(compareTip(day('2026-05-25', '', [de('Whit Monday')]), 'Romania')).toBe('Whit Monday · Germany only');
    expect(compareTip(day('2026-05-04', '', []), 'Romania')).toBe('');
  });

  it('layers band every holiday by who is off; lanes band only a day both are off; weekends keep theirs', () => {
    const both = day('2026-05-01', 'Labour Day', [de('Labour Day')]);
    const theirs = day('2026-05-25', '', [de('Whit Monday')]);
    const satHoliday = day('2026-10-03', '', [de('German Unity Day')], 'weekend');
    expect(compareBand('layers', both)).toBe('both');
    expect(compareBand('layers', theirs)).toBe('theirs');
    expect(compareBand('layers', satHoliday)).toBe('theirs');
    expect(compareBand('lanes', both)).toBe('both');
    expect(compareBand('lanes', theirs)).toBe('');
    expect(compareBand('lanes', satHoliday)).toBe('w');
    expect(compareBand('lanes', day('2026-05-02', '', [], 'weekend'))).toBe('w');
    expect(compareBand('layers', day('2026-05-04', '', []))).toBe('');
    expect(compareBand('layers', { ...both, kind: 'trip' })).toBe(''); // trips and the draft are drawn as before
    expect(compareBand('layers', null)).toBe('');
  });
});

describe('The figures in Settings', () => {
  const mine = { '2026-01-01': 'New Year’s Day', '2026-05-01': 'Labour Day', '2026-06-01': 'Whit Monday' };
  const DE: OtherCountry = { code: 'DE', name: 'Germany', lookup: () => ({ '2026-01-01': 'New Year’s Day', '2026-05-01': 'Labour Day', '2026-05-25': 'Whit Monday', '2026-10-03': 'German Unity Day' }) };

  it('counts the other country’s holidays and the ones on your days', () => {
    expect(compareCounts(mine, [DE], 2026)).toEqual([{ code: 'DE', name: 'Germany', holidays: 4, shared: 2 }]);
    expect(compareCounts({}, [DE], 2026)[0].shared).toBe(0);
  });

  it('words the note', () => {
    expect(compareNote([{ code: 'DE', name: 'Germany', holidays: 4, shared: 2 }])).toBe('4 in Germany, 2 of them on the same days.');
    expect(compareNote([{ code: 'DE', name: 'Germany', holidays: 4, shared: 0 }])).toBe('4 in Germany, none on the same days.');
    expect(compareNote([{ code: 'DE', name: 'Germany', holidays: 4, shared: 4 }])).toBe('4 in Germany, all on the same days.');
    expect(compareNote([])).toBe('');
  });
});
