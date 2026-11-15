import { describe, expect, it } from 'vitest';
import surah from '../data/quran/surah-012.json';
import licence from '../data/quran/LICENSE?raw';

describe('data/quran/surah-012.json', () => {
  it('is Surah 12 with exactly 111 ayat numbered 1 to 111', () => {
    expect(surah.surah).toBe(12);
    expect(surah.ayat.map((ayah) => ayah.number)).toEqual(Array.from({ length: 111 }, (_, i) => i + 1));
  });

  it('has non-empty Arabic and translation, with no surrounding whitespace, on every ayah', () => {
    for (const ayah of surah.ayat) {
      expect(ayah.arabic, `ayah ${ayah.number} arabic`).not.toBe('');
      expect(ayah.translation, `ayah ${ayah.number} translation`).not.toBe('');
      expect(ayah.arabic).toBe(ayah.arabic.trim());
      expect(ayah.translation).toBe(ayah.translation.trim());
    }
  });

  it('ships with the Tanzil licence notice and the translation attribution', () => {
    expect(licence).toContain('Tanzil Project');
    expect(licence).toContain('Creative Commons Attribution 3.0');
    expect(licence).toContain('CHANGING IT IS NOT ALLOWED');
    expect(licence).toContain('Saheeh International');
  });
});
