// Pure parsing of Tanzil's "txt-2" format ("surah|ayah|text" lines, then a '#' licence block).
// No Node imports and no IO: scripts/fetch-quran.ts downloads and writes, this only converts.

export interface TanzilAyah {
  number: number;
  text: string;
}

export interface SurahJson {
  surah: number;
  ayat: { number: number; arabic: string; translation: string }[];
}

const LINE = /^(\d+)\|(\d+)\|(.*)$/;

/** Ayat of one surah from Tanzil text. Text is only trimmed at its edges, never altered. */
export function parseTanzilLines(raw: string, surah: number): TanzilAyah[] {
  const ayat: TanzilAyah[] = [];
  raw.split('\n').forEach((line, index) => {
    const trimmed = line.replace(/\r$/, '');
    if (trimmed.trim() === '' || trimmed.startsWith('#')) return;
    const match = LINE.exec(trimmed);
    if (!match) throw new Error(`Tanzil line ${index + 1} is not "surah|ayah|text": ${trimmed.slice(0, 40)}`);
    if (Number(match[1]) !== surah) return;
    ayat.push({ number: Number(match[2]), text: (match[3] ?? '').trim() });
  });
  return ayat;
}

/** The '#' comment block of a Tanzil file (its licence notice), without the comment markers. */
export function extractLicence(raw: string): string {
  const lines = raw
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.startsWith('#'))
    .map((line) => line.replace(/^# ?/, ''));
  if (lines.every((line) => line.trim() === '')) throw new Error('No licence notice found in the Tanzil file');
  return `${lines.join('\n')}\n`;
}

function checkAyat(label: string, ayat: TanzilAyah[], expected: number): void {
  if (ayat.length !== expected) {
    throw new Error(`Surah check failed: expected ${expected} ayat but ${label} has ${ayat.length}`);
  }
  ayat.forEach((ayah, i) => {
    if (ayah.number !== i + 1) {
      throw new Error(`Surah check failed: ${label} is missing ayah ${i + 1} (found ${ayah.number})`);
    }
    if (ayah.text === '') throw new Error(`Surah check failed: ${label} ayah ${ayah.number} is empty`);
  });
}

export function buildSurahJson(input: {
  arabic: string;
  translation: string;
  surah: number;
  expectedAyat: number;
}): SurahJson {
  const arabic = parseTanzilLines(input.arabic, input.surah);
  const translation = parseTanzilLines(input.translation, input.surah);
  checkAyat('Arabic', arabic, input.expectedAyat);
  checkAyat('translation', translation, input.expectedAyat);
  return {
    surah: input.surah,
    ayat: arabic.map((ayah, i) => ({
      number: ayah.number,
      arabic: ayah.text,
      translation: translation[i]?.text ?? '',
    })),
  };
}
