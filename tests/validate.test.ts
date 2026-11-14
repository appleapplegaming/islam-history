import { describe, expect, it } from 'vitest';
import { findDisallowedArabic, validateChapter } from '../src/content/validate.ts';

const index = new Map([[12, 111]]);
const ARABIC_LETTERS = String.fromCodePoint(0x0627, 0x0628, 0x062a); // alif, ba, ta

function scene(overrides: Record<string, unknown> = {}) {
  return { id: 's1', title: 'T', narration: 'N', refs: ['12:4'], certainty: 'quran', ...overrides };
}

describe('findDisallowedArabic', () => {
  it('allows the honorifics', () => {
    expect(findDisallowedArabic('Yusuf (عليه السلام) and Muhammad ﷺ')).toEqual([]);
  });

  it('flags any other Arabic text', () => {
    expect(findDisallowedArabic(`text ${ARABIC_LETTERS} more`)).toEqual([ARABIC_LETTERS]);
  });

  it('flags presentation-form Arabic too', () => {
    expect(findDisallowedArabic(String.fromCodePoint(0xfe8d, 0xfe8f))).toHaveLength(1);
  });
});

describe('validateChapter', () => {
  it('accepts a valid chapter', () => {
    expect(validateChapter('y.json', { scenes: [scene()] }, index)).toEqual([]);
  });

  it('fails when a scene has no refs', () => {
    expect(validateChapter('y.json', { scenes: [scene({ refs: [] })] }, index)).toEqual(['y.json scene "s1": has no refs']);
  });

  it('fails when a ref points past data/quran', () => {
    expect(validateChapter('y.json', { scenes: [scene({ refs: ['12:200'] })] }, index)[0]).toMatch(/only 111 ayat/);
  });

  it('fails when a tradition scene has no visible label', () => {
    const errors = validateChapter('y.json', { scenes: [scene({ certainty: 'tradition' })] }, index);
    expect(errors).toEqual(['y.json scene "s1": tradition scene has no visible "traditionLabel"']);
    expect(validateChapter('y.json', { scenes: [scene({ certainty: 'tradition', traditionLabel: 'From tradition' })] }, index)).toEqual([]);
  });

  it('fails when a hadith scene does not name its source', () => {
    expect(validateChapter('y.json', { scenes: [scene({ certainty: 'hadith' })] }, index)[0]).toMatch(/collection and number/);
  });

  it('fails when a tafsir note has no source', () => {
    const errors = validateChapter('y.json', { scenes: [scene({ tafsirNotes: [{ ayah: '12:4', note: 'x' }] })] }, index);
    expect(errors).toEqual(['y.json scene "s1": tafsirNotes[0] has no source']);
  });

  it('fails on missing required fields and unknown certainty', () => {
    const errors = validateChapter('y.json', { scenes: [{ refs: ['12:4'], certainty: 'rumour' }] }, index);
    expect(errors).toEqual([
      'y.json scene #0: missing "id"',
      'y.json scene #0: missing "title"',
      'y.json scene #0: missing "narration"',
      'y.json scene #0: certainty must be one of quran, hadith, tradition',
    ]);
  });

  it('fails when the file has no scenes array', () => {
    expect(validateChapter('y.json', {}, index)).toEqual(['y.json: missing "scenes" array']);
  });
});
