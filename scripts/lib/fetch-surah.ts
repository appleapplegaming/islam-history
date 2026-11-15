// Orchestration of the Quran fetch with its IO injected, so "writes nothing on failure" and
// "same input gives the same bytes" can be tested without a network or a disk.
import { buildSurahJson, extractBasmala, extractLicence, findLicence } from './tanzil.ts';

export interface FetchSurahDeps {
  download: (url: string) => Promise<string>;
  /** Called only after every download and check has succeeded. */
  write: (fileName: string, content: string) => Promise<void>;
}

export interface FetchSurahInput {
  surah: number;
  expectedAyat: number;
  fileName: string;
  arabicUrl: string;
  translationUrl: string;
}

/** Returns the number of ayat written. Throws before writing anything if any step fails. */
export async function fetchSurah(input: FetchSurahInput, deps: FetchSurahDeps): Promise<number> {
  const [arabic, translation] = await Promise.all([
    deps.download(input.arabicUrl),
    deps.download(input.translationUrl),
  ]);
  const surah = buildSurahJson({
    arabic,
    translation,
    surah: input.surah,
    expectedAyat: input.expectedAyat,
  });
  const translationLicence = findLicence(translation);
  const licence =
    translationLicence === undefined
      ? extractLicence(arabic)
      : `${extractLicence(arabic)}\n${translationLicence}`;
  await deps.write(input.fileName, `${JSON.stringify(surah, null, 2)}\n`);
  await deps.write('basmala.json', `${JSON.stringify({ source: 'Tanzil 1:1', arabic: extractBasmala(arabic) }, null, 2)}\n`);
  await deps.write('LICENSE', licence);
  return surah.ayat.length;
}
