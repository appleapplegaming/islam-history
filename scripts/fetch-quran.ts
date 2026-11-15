// Downloads Surah Yusuf (12) from Tanzil.net (Uthmani Arabic + Sahih International) and writes
// data/quran/surah-012.json and data/quran/LICENSE. Nothing is written unless everything checks out.
// Usage: node scripts/fetch-quran.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSurah } from './lib/fetch-surah.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'quran');

async function download(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status} ${response.statusText}): ${url}`);
  return response.text();
}

async function write(fileName: string, content: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fileName), content);
}

fetchSurah(
  {
    surah: 12,
    expectedAyat: 111,
    fileName: 'surah-012.json',
    arabicUrl:
      'https://tanzil.net/pub/download/index.php?quranType=uthmani&marks=true&sajdah=false&tatweel=false&outType=txt-2&agree=true',
    translationUrl: 'https://tanzil.net/trans/en.sahih',
  },
  { download, write },
)
  .then((count) => console.log(`Wrote ${count} ayat to data/quran/surah-012.json and the Tanzil licence.`))
  .catch((error: unknown) => {
    console.error(`fetch-quran failed, nothing written: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
