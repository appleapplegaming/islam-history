// Downloads Surah Yusuf (12) from Tanzil.net (Uthmani Arabic + Sahih International) and writes
// data/quran/surah-012.json and data/quran/LICENSE. Nothing is written unless everything checks out.
// Usage: node scripts/fetch-quran.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSurahJson, extractLicence } from './lib/tanzil.ts';

const SURAH = 12;
const AYAT = 111;
const ARABIC_URL =
  'https://tanzil.net/pub/download/index.php?quranType=uthmani&marks=true&sajdah=false&tatweel=false&outType=txt-2&agree=true';
const TRANSLATION_URL = 'https://tanzil.net/trans/en.sahih';

async function download(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status} ${response.statusText}): ${url}`);
  return response.text();
}

async function main(): Promise<void> {
  const [arabic, translation] = await Promise.all([download(ARABIC_URL), download(TRANSLATION_URL)]);
  const surah = buildSurahJson({ arabic, translation, surah: SURAH, expectedAyat: AYAT });
  const licence = extractLicence(arabic);
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'quran');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'surah-012.json'), `${JSON.stringify(surah, null, 2)}\n`);
  await writeFile(join(dir, 'LICENSE'), licence);
  console.log(`Wrote ${surah.ayat.length} ayat to data/quran/surah-012.json and the Tanzil licence.`);
}

main().catch((error: unknown) => {
  console.error(`fetch-quran failed, nothing written: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
