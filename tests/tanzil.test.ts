import { describe, expect, it } from 'vitest';
import { buildSurahJson, parseTanzilLines } from '../scripts/lib/tanzil.ts';

const arabic = ['12|1|AR one', '12|2|AR two', '13|1|AR other surah', '#', '# licence notice'].join('\n');
const english = ['12|1|EN one', '12|2|EN two', '13|1|EN other surah', '#', '# licence notice'].join('\n');

describe('parseTanzilLines', () => {
  it('keeps only the requested surah, in ayah order', () => {
    expect(parseTanzilLines(arabic, 12)).toEqual([
      { number: 1, text: 'AR one' },
      { number: 2, text: 'AR two' },
    ]);
  });

  it('ignores comment and blank lines and tolerates CRLF', () => {
    expect(parseTanzilLines('# note\r\n\r\n12|1|AR one\r\n', 12)).toEqual([{ number: 1, text: 'AR one' }]);
  });

  it('keeps pipes inside the text and trims only surrounding whitespace', () => {
    expect(parseTanzilLines('12|1|  a | b  c  ', 12)).toEqual([{ number: 1, text: 'a | b  c' }]);
  });

  it('rejects a malformed line with its line number', () => {
    expect(() => parseTanzilLines('12|1|ok\nnot a line', 12)).toThrow(/line 2/);
    expect(() => parseTanzilLines('12|x|ok', 12)).toThrow(/line 1/);
  });
});

describe('buildSurahJson', () => {
  it('joins Arabic and translation by ayah number', () => {
    expect(buildSurahJson({ arabic, translation: english, surah: 12, expectedAyat: 2 })).toEqual({
      surah: 12,
      ayat: [
        { number: 1, arabic: 'AR one', translation: 'EN one' },
        { number: 2, arabic: 'AR two', translation: 'EN two' },
      ],
    });
  });

  it('fails when the ayah count is not the expected one', () => {
    expect(() => buildSurahJson({ arabic, translation: english, surah: 12, expectedAyat: 111 })).toThrow(
      /expected 111 ayat but Arabic has 2/,
    );
    expect(() =>
      buildSurahJson({ arabic, translation: '12|1|EN one', surah: 12, expectedAyat: 2 }),
    ).toThrow(/expected 2 ayat but translation has 1/);
  });

  it('fails when ayat are not numbered 1..n', () => {
    const gap = '12|1|AR one\n12|3|AR three';
    const en = '12|1|EN one\n12|3|EN three';
    expect(() => buildSurahJson({ arabic: gap, translation: en, surah: 12, expectedAyat: 2 })).toThrow(/ayah 2/);
  });

  it('fails when any text is empty', () => {
    const empty = '12|1|AR one\n12|2|   ';
    expect(() => buildSurahJson({ arabic: empty, translation: english, surah: 12, expectedAyat: 2 })).toThrow(/empty/);
  });
});
