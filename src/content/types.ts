export type Certainty = 'quran' | 'hadith' | 'tradition';

export interface TafsirNote {
  source: string;
  ayah: string;
  note: string;
}

export interface Scene {
  id: string;
  title: string;
  narration: string;
  refs: string[];
  certainty: Certainty;
  /** Required when certainty is 'hadith': collection and number, e.g. "Sahih al-Bukhari 3390". */
  hadith?: string;
  /** Required when certainty is 'tradition': the label shown in the game. */
  traditionLabel?: string;
  tafsirNotes?: TafsirNote[];
}

export interface Chapter {
  id: string;
  title: string;
  surah: number;
  scenes: Scene[];
}

/** Number of ayat in each surah that exists in data/quran/. */
export type QuranIndex = ReadonlyMap<number, number>;
