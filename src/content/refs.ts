import type { QuranIndex } from './types.ts';

export interface AyahRange {
  surah: number;
  from: number;
  to: number;
}

const REF_PATTERN = /^(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/;

/** Parses "12:4" or "12:5-6". Throws with the bad ref in the message if it is malformed. */
export function parseRef(ref: string): AyahRange {
  const match = REF_PATTERN.exec(ref);
  if (!match) throw new Error(`Malformed ayah ref "${ref}", expected "surah:ayah" or "surah:from-to"`);
  const surah = Number(match[1]);
  const from = Number(match[2]);
  const to = match[3] === undefined ? from : Number(match[3]);
  if (surah < 1 || from < 1 || to < from) {
    throw new Error(`Invalid ayah ref "${ref}"`);
  }
  return { surah, from, to };
}

/** Returns an error message if the ref points outside data/quran/, otherwise undefined. */
export function checkRefExists(ref: string, index: QuranIndex): string | undefined {
  let range: AyahRange;
  try {
    range = parseRef(ref);
  } catch (error) {
    return (error as Error).message;
  }
  const count = index.get(range.surah);
  if (count === undefined) return `Ref "${ref}": surah ${range.surah} is not in data/quran/`;
  if (range.to > count) return `Ref "${ref}": surah ${range.surah} has only ${count} ayat`;
  return undefined;
}
