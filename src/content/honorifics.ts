import { ALLOWED_ARABIC } from './validate.ts';

/**
 * Prophets named in the Quran, in the transliterations this project uses, plus common spelling
 * variants. Matching is case-sensitive so lowercase ids ("yusuf-well") never count as mentions.
 */
const PROPHET_NAMES = [
  'Adam', 'Idris', 'Nuh', 'Hud', 'Salih', 'Ibrahim', 'Lut', 'Ismail', "Isma'il", 'Ishaq',
  'Yaqub', "Ya'qub", 'Yusuf', 'Ayyub', 'Shuayb', "Shu'ayb", 'Musa', 'Harun', 'Dhul-Kifl',
  'Dawud', 'Sulayman', 'Ilyas', 'Al-Yasa', 'Yunus', 'Zakariyya', 'Zakariya', 'Yahya', 'Isa',
] as const;

const MUHAMMAD = 'Muhammad';
const [ALAYHI_SALAM, ALAYHIM_SALAM, SALAWAT] = ALLOWED_ARABIC;

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PROPHET_HONORIFIC = `\\s*(?:\\(as\\)|\\(${escape(ALAYHI_SALAM)}\\)|\\(${escape(ALAYHIM_SALAM)}\\))`;
const MUHAMMAD_HONORIFIC = `\\s*${SALAWAT}`;

// Longest names first so "Ya'qub" is matched whole before "Yaqub"-like prefixes.
const NAME_ALTERNATION = [...PROPHET_NAMES, MUHAMMAD]
  .toSorted((a, b) => b.length - a.length)
  .map(escape)
  .join('|');

// A name not preceded by "Surah"/"Surat" (surah names take no honorific) and not part of a
// longer word.
const MENTION = new RegExp(`(?<!Sura[ht]\\s)(?<![\\w'-])(${NAME_ALTERNATION})(?![\\w'-])`, 'g');

/**
 * Returns each prophet name in the text that is not directly followed by its honorific:
 * ﷺ after the Prophet Muhammad, (as) or (عليه السلام) after other prophets.
 * Every mention is checked, not only the first.
 */
export function findMissingHonorifics(text: string): string[] {
  const missing: string[] = [];
  for (const match of text.matchAll(MENTION)) {
    const name = match[1] as string;
    const rest = text.slice(match.index + match[0].length);
    const honorific = new RegExp(`^${name === MUHAMMAD ? MUHAMMAD_HONORIFIC : PROPHET_HONORIFIC}`);
    if (!honorific.test(rest)) missing.push(name);
  }
  return missing;
}

/** Checks every string value in a parsed content JSON file. Returns human-readable errors. */
export function checkHonorificsInJson(file: string, data: unknown): string[] {
  const errors: string[] = [];
  const visit = (value: unknown, path: string): void => {
    if (typeof value === 'string') {
      for (const name of findMissingHonorifics(value)) {
        errors.push(`${file} ${path}: "${name}" has no honorific after it`);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}[${i}]`));
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, item] of Object.entries(value)) visit(item, path ? `${path}.${key}` : key);
    }
  };
  visit(data, '');
  return errors;
}
