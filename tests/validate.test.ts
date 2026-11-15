import { describe, expect, it } from 'vitest';
import { findDisallowedArabic, validateChapter } from '../src/content/validate.ts';

const index = new Map([[12, 111]]);
const ARABIC_LETTERS = String.fromCodePoint(0x0627, 0x0628, 0x062a); // alif, ba, ta

const VALID_BEATS = [
  { kind: 'narration', text: 'N' },
  { kind: 'ayah', ref: '12:4' },
];

function scene(overrides: Record<string, unknown> = {}) {
  return { id: 's1', title: 'T', beats: VALID_BEATS, refs: ['12:4'], certainty: 'quran', ...overrides };
}

function errorsFor(overrides: Record<string, unknown>) {
  return validateChapter('y.json', { scenes: [scene(overrides)] }, index);
}

describe('findDisallowedArabic', () => {
  it('allows the honorifics', () => {
    expect(findDisallowedArabic('Yusuf (عليه السلام) and Muhammad ﷺ')).toEqual([]);
  });

  it('flags any other Arabic text', () => {
    expect(findDisallowedArabic(`text ${ARABIC_LETTERS} more`)).toEqual([ARABIC_LETTERS]);
  });

  it('reports the Arabic on each side of an honorific as separate runs', () => {
    const salawat = String.fromCodePoint(0xfdfa);
    expect(findDisallowedArabic(`${ARABIC_LETTERS}${salawat}${ARABIC_LETTERS}`)).toEqual([ARABIC_LETTERS, ARABIC_LETTERS]);
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
      'y.json scene #0: has no beats',
      'y.json scene #0: certainty must be one of quran, hadith, tradition',
    ]);
  });

  it('fails when the file has no scenes array', () => {
    expect(validateChapter('y.json', {}, index)).toEqual(['y.json: missing "scenes" array']);
  });

  it('fails when the file is not a JSON object', () => {
    expect(validateChapter('y.json', null, index)).toEqual(['y.json: not a JSON object']);
    expect(validateChapter('y.json', 'scenes', index)).toEqual(['y.json: not a JSON object']);
  });

  it('fails when a scene is not an object', () => {
    expect(validateChapter('y.json', { scenes: [null, 'scene'] }, index)).toEqual(['y.json scene #0: not an object', 'y.json scene #1: not an object']);
  });

  it('treats a whitespace-only field as missing', () => {
    expect(validateChapter('y.json', { scenes: [scene({ title: '   ' })] }, index)).toEqual(['y.json scene "s1": missing "title"']);
  });

  it('fails when a ref is not a string', () => {
    expect(validateChapter('y.json', { scenes: [scene({ refs: [42] })] }, index)).toEqual(['y.json scene "s1": ref 42 is not a string']);
  });

  it('accepts complete tafsir notes', () => {
    expect(validateChapter('y.json', { scenes: [scene({ tafsirNotes: [{ source: 'Ibn Kathir', ayah: '12:4' }] })] }, index)).toEqual([]);
  });

  it('fails when a tafsir note has no ayah', () => {
    const errors = validateChapter('y.json', { scenes: [scene({ tafsirNotes: [{ source: 'Ibn Kathir' }] })] }, index);
    expect(errors).toEqual(['y.json scene "s1": tafsirNotes[0] has no ayah']);
  });

  it('fails when a tafsir note is not an object', () => {
    expect(validateChapter('y.json', { scenes: [scene({ tafsirNotes: [null] })] }, index)).toEqual([
      'y.json scene "s1": tafsirNotes[0] has no source',
      'y.json scene "s1": tafsirNotes[0] has no ayah',
    ]);
  });

  it('fails when a scene has no beats', () => {
    expect(errorsFor({ beats: [] })).toEqual(['y.json scene "s1": has no beats']);
    expect(errorsFor({ beats: 'N' })).toEqual(['y.json scene "s1": has no beats']);
  });

  it('accepts a scene with both beat kinds, an ayah beat anywhere inside a range ref', () => {
    const beats = [
      { kind: 'narration', text: 'You see the well.' },
      { kind: 'ayah', ref: '12:19' },
      { kind: 'ayah', ref: '12:20' },
    ];
    expect(errorsFor({ refs: ['12:4', '12:19-20'], beats })).toEqual([]);
  });

  it('fails on a beat of an unknown kind, naming its position', () => {
    const beats = [{ kind: 'narration', text: 'N' }, { kind: 'dialogue', text: 'x' }, { text: 'no kind' }, null, 'N'];
    expect(errorsFor({ beats })).toEqual([
      'y.json scene "s1" beat #1: unknown kind "dialogue", expected narration or ayah',
      'y.json scene "s1" beat #2: unknown kind undefined, expected narration or ayah',
      'y.json scene "s1" beat #3: unknown kind undefined, expected narration or ayah',
      'y.json scene "s1" beat #4: unknown kind undefined, expected narration or ayah',
    ]);
  });

  it('fails on a narration beat with missing or blank text', () => {
    const beats = [{ kind: 'narration' }, { kind: 'narration', text: '  ' }, { kind: 'narration', text: 7 }];
    expect(errorsFor({ beats })).toEqual([
      'y.json scene "s1" beat #0: narration beat has no text',
      'y.json scene "s1" beat #1: narration beat has no text',
      'y.json scene "s1" beat #2: narration beat has no text',
    ]);
  });

  it('fails on an ayah beat whose ref is missing or malformed', () => {
    const beats = [{ kind: 'ayah' }, { kind: 'ayah', ref: 12 }, { kind: 'ayah', ref: 'twelve:four' }];
    expect(errorsFor({ beats })).toEqual([
      'y.json scene "s1" beat #0: ayah beat ref undefined is not a string',
      'y.json scene "s1" beat #1: ayah beat ref 12 is not a string',
      'y.json scene "s1" beat #2: Malformed ayah ref "twelve:four", expected "surah:ayah" or "surah:from-to"',
    ]);
  });

  it('fails on an ayah beat whose ref is a range, not a single ayah', () => {
    const beats = [{ kind: 'ayah', ref: '12:4-5' }, { kind: 'ayah', ref: '12:4-4' }];
    expect(errorsFor({ refs: ['12:4-5'], beats })).toEqual([
      'y.json scene "s1" beat #0: ayah beat ref "12:4-5" must be a single ayah, not a range',
      'y.json scene "s1" beat #1: ayah beat ref "12:4-4" must be a single ayah, not a range',
    ]);
  });

  it('fails on an ayah beat whose ref is not in data/quran', () => {
    const beats = [{ kind: 'ayah', ref: '12:112' }, { kind: 'ayah', ref: '13:1' }];
    expect(errorsFor({ beats })).toEqual([
      'y.json scene "s1" beat #0: Ref "12:112": surah 12 has only 111 ayat',
      'y.json scene "s1" beat #1: Ref "13:1": surah 13 is not in data/quran/',
    ]);
  });

  it("fails on an ayah beat outside the scene's refs", () => {
    const beats = [
      { kind: 'ayah', ref: '12:18' },
      { kind: 'ayah', ref: '12:19' },
      { kind: 'ayah', ref: '12:20' },
      { kind: 'ayah', ref: '12:21' },
    ];
    expect(errorsFor({ refs: ['12:19-20'], beats })).toEqual([
      'y.json scene "s1" beat #0: ayah beat ref "12:18" is not inside the scene\'s refs',
      'y.json scene "s1" beat #3: ayah beat ref "12:21" is not inside the scene\'s refs',
    ]);
  });

  it("matches an ayah beat against the scene's refs by surah too", () => {
    const quran = new Map([
      [1, 7],
      [12, 111],
    ]);
    const chapter = { scenes: [scene({ refs: ['1:4'], beats: [{ kind: 'ayah', ref: '12:4' }] })] };
    expect(validateChapter('y.json', chapter, quran)).toEqual([
      'y.json scene "s1" beat #0: ayah beat ref "12:4" is not inside the scene\'s refs',
    ]);
  });

  it("ignores the scene's own bad refs when placing an ayah beat, and reports them once", () => {
    expect(errorsFor({ refs: ['bad', 7, '12:4'] })).toEqual([
      'y.json scene "s1": Malformed ayah ref "bad", expected "surah:ayah" or "surah:from-to"',
      'y.json scene "s1": ref 7 is not a string',
    ]);
  });

  it('reports missing scene refs once, without placing ayah beats against them', () => {
    expect(errorsFor({ refs: '12:4' })).toEqual(['y.json scene "s1": has no refs']);
    expect(errorsFor({ refs: undefined })).toEqual(['y.json scene "s1": has no refs']);
  });

  it('does not treat a non-string scene ref as a range when placing an ayah beat', () => {
    // String(['12:4']) is "12:4", so only the type check keeps this ref from counting.
    expect(errorsFor({ refs: [['12:4']], beats: [{ kind: 'ayah', ref: '12:5' }] })).toEqual([
      'y.json scene "s1": ref ["12:4"] is not a string',
    ]);
  });

  it('names the scene by position when it has no id', () => {
    const errors = validateChapter('y.json', { scenes: [scene({ id: undefined, beats: [{ kind: 'poem' }] })] }, index);
    expect(errors).toEqual(['y.json scene #0: missing "id"', 'y.json scene #0 beat #0: unknown kind "poem", expected narration or ayah']);
  });

  it('no longer reads a scene-level narration field', () => {
    expect(errorsFor({ beats: undefined, narration: 'N' })).toEqual(['y.json scene "s1": has no beats']);
  });

  it('fails when tafsirNotes is not an array', () => {
    expect(validateChapter('y.json', { scenes: [scene({ tafsirNotes: 'Ibn Kathir' })] }, index)).toEqual([
      'y.json scene "s1": "tafsirNotes" must be an array',
    ]);
  });
});
