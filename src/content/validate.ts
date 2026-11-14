import { checkRefExists } from './refs.ts';
import type { QuranIndex } from './types.ts';

/**
 * Arabic phrases allowed outside data/quran/: honorifics only. Everything else in Arabic script
 * is treated as possible Quran text and fails validation.
 */
export const ALLOWED_ARABIC = ['عليه السلام', 'عليهم السلام', 'ﷺ'] as const;

// Arabic, Arabic Supplement, Arabic Extended-A, Presentation Forms A and B. Built from code
// points so this file holds no Arabic characters of its own.
const ARABIC_RANGES: readonly [number, number][] = [
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0x08a0, 0x08ff],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];
const ARABIC_RUN = new RegExp(
  `[${ARABIC_RANGES.map(([from, to]) => `${String.fromCodePoint(from)}-${String.fromCodePoint(to)}`).join('')}]+`,
  'g',
);

/** Returns each Arabic-script run in the text that is not an allowed honorific. */
export function findDisallowedArabic(text: string): string[] {
  let remaining = text;
  for (const phrase of ALLOWED_ARABIC) remaining = remaining.split(phrase).join(' ');
  return remaining.match(ARABIC_RUN) ?? [];
}

const CERTAINTIES = ['quran', 'hadith', 'tradition'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks one chapter file's parsed JSON. Takes `unknown` because the file has not been
 * type-checked yet. Returns human-readable errors, empty when the chapter is valid.
 */
export function validateChapter(file: string, chapter: unknown, index: QuranIndex): string[] {
  const errors: string[] = [];
  if (typeof chapter !== 'object' || chapter === null) return [`${file}: not a JSON object`];
  const scenes = (chapter as { scenes?: unknown }).scenes;
  if (!Array.isArray(scenes)) return [`${file}: missing "scenes" array`];

  scenes.forEach((scene: Record<string, unknown>, i) => {
    const where = `${file} scene ${isNonEmptyString(scene?.id) ? `"${scene.id}"` : `#${i}`}`;
    if (typeof scene !== 'object' || scene === null) {
      errors.push(`${where}: not an object`);
      return;
    }
    for (const field of ['id', 'title', 'narration'] as const) {
      if (!isNonEmptyString(scene[field])) errors.push(`${where}: missing "${field}"`);
    }

    const refs = scene.refs;
    if (!Array.isArray(refs) || refs.length === 0) {
      errors.push(`${where}: has no refs`);
    } else {
      for (const ref of refs) {
        const problem = typeof ref === 'string' ? checkRefExists(ref, index) : `ref ${JSON.stringify(ref)} is not a string`;
        if (problem) errors.push(`${where}: ${problem}`);
      }
    }

    if (!CERTAINTIES.includes(scene.certainty as string)) {
      errors.push(`${where}: certainty must be one of ${CERTAINTIES.join(', ')}`);
    }
    if (scene.certainty === 'hadith' && !isNonEmptyString(scene.hadith)) {
      errors.push(`${where}: hadith scene must name the collection and number in "hadith"`);
    }
    if (scene.certainty === 'tradition' && !isNonEmptyString(scene.traditionLabel)) {
      errors.push(`${where}: tradition scene has no visible "traditionLabel"`);
    }

    const notes = scene.tafsirNotes;
    if (notes !== undefined) {
      if (!Array.isArray(notes)) {
        errors.push(`${where}: "tafsirNotes" must be an array`);
      } else {
        notes.forEach((note: Record<string, unknown>, n) => {
          if (!isNonEmptyString(note?.source)) errors.push(`${where}: tafsirNotes[${n}] has no source`);
          if (!isNonEmptyString(note?.ayah)) errors.push(`${where}: tafsirNotes[${n}] has no ayah`);
        });
      }
    }
  });
  return errors;
}
