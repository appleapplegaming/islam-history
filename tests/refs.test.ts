import { describe, expect, it } from 'vitest';
import { checkRefExists, parseRef } from '../src/content/refs.ts';

const index = new Map([[12, 111]]);

describe('parseRef', () => {
  it('parses a single ayah and a range', () => {
    expect(parseRef('12:4')).toEqual({ surah: 12, from: 4, to: 4 });
    expect(parseRef('12:5-6')).toEqual({ surah: 12, from: 5, to: 6 });
  });

  it.each(['12', '12:', 'twelve:4', '12:0', '0:4', '12:6-5', ' 12:4'])('rejects "%s"', (ref) => {
    expect(() => parseRef(ref)).toThrow(ref.trim() === '' ? undefined : /ref/);
  });
});

describe('checkRefExists', () => {
  it('accepts refs inside the loaded data', () => {
    expect(checkRefExists('12:1', index)).toBeUndefined();
    expect(checkRefExists('12:110-111', index)).toBeUndefined();
  });

  it('rejects an ayah past the end of the surah', () => {
    expect(checkRefExists('12:112', index)).toMatch(/only 111 ayat/);
  });

  it('rejects a surah that is not in data/quran', () => {
    expect(checkRefExists('2:255', index)).toMatch(/surah 2 is not in data\/quran/);
  });

  it('returns the parse error for a malformed ref', () => {
    expect(checkRefExists('12-4', index)).toMatch(/Malformed/);
  });
});
