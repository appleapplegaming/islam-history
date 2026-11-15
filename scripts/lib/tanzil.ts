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

const PREFIX = /^(\d+)\|(\d+)\|/;

/** Ayat of one surah from Tanzil text. Text is only trimmed at its edges, never altered. */
export function parseTanzilLines(raw: string, surah: number): TanzilAyah[] {
  const ayat: TanzilAyah[] = [];
  raw.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === '' || line.startsWith('#')) return;
    const match = PREFIX.exec(line);
    if (!match) throw new Error(`Tanzil line ${index + 1} is not "surah|ayah|text": ${line.slice(0, 40)}`);
    if (Number(match[1]) !== surah) return;
    ayat.push({ number: Number(match[2]), text: line.slice(match[0].length).trim() });
  });
  return ayat;
}

/** The '#' comment block of a Tanzil file (its licence notice), without the comment markers. */
export function extractLicence(raw: string): string {
  const licence = findLicence(raw);
  if (licence === undefined) throw new Error('No licence notice found in the Tanzil file');
  return licence;
}

/** Like extractLicence, but undefined when the file carries no notice. */
export function findLicence(raw: string): string | undefined {
  const lines = raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith('#'))
    .map((line) => line.replace(/^# ?/, ''));
  return lines.join('').trim() === '' ? undefined : `${lines.join('\n')}\n`;
}

function checkAyat(label: string, ayat: TanzilAyah[], expected: number): void {
  if (ayat.length !== expected) {
    throw new Error(`Surah check failed: expected ${expected} ayat but ${label} has ${ayat.length}`);
  }
  ayat.forEach((ayah) => {
    if (ayah.text === '') throw new Error(`Surah check failed: ${label} ayah ${ayah.number} is empty`);
  });
}

/** Tanzil's text of 1:1, which is the basmala. Taken from the data, never typed. */
export function extractBasmala(raw: string): string {
  const first = parseTanzilLines(raw, 1).find((ayah) => ayah.number === 1);
  if (first === undefined) throw new Error('Surah check failed: 1:1 is missing from the Arabic, so the basmala is unknown');
  return first.text;
}

/** Tanzil prefixes the basmala to the first ayah of a surah; it is not part of that ayah. */
function withoutBasmala(surah: number, ayat: TanzilAyah[], basmala: string): TanzilAyah[] {
  return ayat.map((ayah) => {
    if (ayah.number !== 1) return ayah;
    const rest = ayah.text.slice(basmala.length);
    if (!ayah.text.startsWith(basmala) || rest === rest.trimStart()) {
      throw new Error(`Surah check failed: ${surah}:1 does not start with the text of 1:1 followed by whitespace`);
    }
    return { number: 1, text: rest.trimStart() };
  });
}

export function buildSurahJson(input: {
  arabic: string;
  translation: string;
  surah: number;
  expectedAyat: number;
}): SurahJson {
  const arabic = withoutBasmala(
    input.surah,
    parseTanzilLines(input.arabic, input.surah),
    extractBasmala(input.arabic),
  );
  const translation = parseTanzilLines(input.translation, input.surah);
  checkAyat('Arabic', arabic, input.expectedAyat);
  checkAyat('translation', translation, input.expectedAyat);
  const translationByNumber = new Map(translation.map((ayah) => [ayah.number, ayah.text]));
  return {
    surah: input.surah,
    ayat: arabic.map((ayah, i) => {
      const expectedNumber = i + 1;
      const text = translationByNumber.get(expectedNumber);
      if (ayah.number !== expectedNumber || text === undefined) {
        throw new Error(`Surah check failed: ayah ${expectedNumber} is missing from the Arabic or the translation`);
      }
      return { number: ayah.number, arabic: ayah.text, translation: text };
    }),
  };
}
