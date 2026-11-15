import { describe, expect, it } from 'vitest';
import { buildSurahJson, extractLicence, findLicence, parseTanzilLines } from '../scripts/lib/tanzil.ts';

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

  it('skips whitespace-only lines and parses the line after them', () => {
    expect(parseTanzilLines('   \n12|1|AR one', 12)).toEqual([{ number: 1, text: 'AR one' }]);
  });

  it('matches the whole surah and ayah numbers, not a prefix or a single digit', () => {
    expect(parseTanzilLines('112|1|x\n12|10|y\n', 12)).toEqual([{ number: 10, text: 'y' }]);
    expect(() => parseTanzilLines('x12|1|bad', 12)).toThrow(/line 1/);
    expect(() => parseTanzilLines('12|1x|bad', 12)).toThrow(/line 1/);
  });

  it('shows only the first 40 characters of a malformed line', () => {
    const long = `bad ${'x'.repeat(60)}`;
    expect(() => parseTanzilLines(long, 12)).toThrow(new RegExp(`: ${long.slice(0, 40)}$`));
  });

  it('rejects a malformed line with its line number', () => {
    expect(() => parseTanzilLines('12|1|ok\nnot a line', 12)).toThrow(/line 2/);
    expect(() => parseTanzilLines('12|x|ok', 12)).toThrow(/line 1/);
  });
});

describe('extractLicence', () => {
  it('returns the comment block with the leading "# " removed, as published', () => {
    const raw = '12|1|AR one\n# Copyright\n#\n# Terms apply\r\n';
    expect(extractLicence(raw)).toBe('Copyright\n\nTerms apply\n');
  });

  it('fails when the file carries no licence notice', () => {
    expect(() => extractLicence('12|1|AR one')).toThrow(/licence/);
  });

  it('fails when the comment block is only blank comment lines', () => {
    expect(() => extractLicence('12|1|AR one\n#\n#  \n')).toThrow(/licence/);
  });

  it('removes only the leading comment marker, not a "#" inside the text', () => {
    expect(extractLicence('# issue #1\n#   indented\n')).toBe('issue #1\n  indented\n');
  });
});

describe('findLicence', () => {
  it('returns undefined when there is no notice, and the notice when there is one', () => {
    expect(findLicence('12|1|AR one\n')).toBeUndefined();
    expect(findLicence('12|1|AR one\n# Terms\n')).toBe('Terms\n');
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

  it('fails when the Arabic has a gap but the translation is numbered 1..n', () => {
    const gap = '12|1|AR one\n12|3|AR three';
    expect(() => buildSurahJson({ arabic: gap, translation: english, surah: 12, expectedAyat: 2 })).toThrow(/ayah 2/);
  });

  it('fails when the translation numbers differ from the Arabic', () => {
    const en = '12|1|EN one\n12|3|EN three';
    expect(() => buildSurahJson({ arabic, translation: en, surah: 12, expectedAyat: 2 })).toThrow(/ayah 2/);
  });

  it('fails when any text is empty', () => {
    const empty = '12|1|AR one\n12|2|   ';
    expect(() => buildSurahJson({ arabic: empty, translation: english, surah: 12, expectedAyat: 2 })).toThrow(/empty/);
  });
});
