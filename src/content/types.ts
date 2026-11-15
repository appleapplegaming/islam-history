export type Certainty = 'quran' | 'hadith' | 'tradition';

export interface TafsirNote {
  source: string;
  ayah: string;
  note: string;
}

/** A beat of narration: text that is not Quran text (see GLOSSARY.md). */
export interface NarrationBeat {
  kind: 'narration';
  text: string;
}

/**
 * A beat that shows one whole ayah. It carries only the ref (a single ayah, e.g. "12:19");
 * the Arabic and English are resolved from data/quran/, never stored in content.
 */
export interface AyahBeat {
  kind: 'ayah';
  ref: string;
}

export type Beat = NarrationBeat | AyahBeat;

export interface Scene {
  id: string;
  title: string;
  /** The scene told in order, one screen per beat. Never empty. */
  beats: Beat[];
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
