import { describe, expect, it } from 'vitest';
import { checkHonorificsInJson, findMissingHonorifics } from '../src/content/honorifics.ts';

const ALAYHI_SALAM = '(عليه السلام)';

describe('findMissingHonorifics', () => {
  it('accepts a prophet name followed by (as)', () => {
    expect(findMissingHonorifics('Yusuf (as) told his father.')).toEqual([]);
  });

  it('accepts the Arabic honorific', () => {
    expect(findMissingHonorifics(`Yusuf ${ALAYHI_SALAM} told his father.`)).toEqual([]);
  });

  it('flags a prophet name with no honorific', () => {
    expect(findMissingHonorifics('Yusuf told his father.')).toEqual(['Yusuf']);
  });

  it('checks every mention, not only the first', () => {
    expect(findMissingHonorifics('Yaqub (as) loved Yusuf (as). Later Yusuf wept.')).toEqual(['Yusuf']);
  });

  it('requires the salawat after the Prophet Muhammad, not (as)', () => {
    expect(findMissingHonorifics('Muhammad ﷺ')).toEqual([]);
    expect(findMissingHonorifics('Muhammad (as)')).toEqual(['Muhammad']);
  });

  it('does not require an honorific in a surah name', () => {
    expect(findMissingHonorifics('Surah Yusuf and Surat Hud')).toEqual([]);
  });

  it('accepts spelling variants with an apostrophe', () => {
    expect(findMissingHonorifics("Ya'qub (as) and Shu'ayb")).toEqual(["Shu'ayb"]);
  });

  it('ignores lowercase ids such as file names', () => {
    expect(findMissingHonorifics('yusuf-well yusuf.json')).toEqual([]);
  });

  it('does not match a name inside a longer word', () => {
    expect(findMissingHonorifics('Adamant Musafir')).toEqual([]);
  });
});

describe('checkHonorificsInJson', () => {
  it('reports the path of every string missing an honorific', () => {
    const chapter = { title: 'Surah Yusuf', scenes: [{ narration: 'Yusuf dreamed.' }, { narration: 'Yusuf (as) woke.' }] };
    expect(checkHonorificsInJson('y.json', chapter)).toEqual(['y.json scenes[0].narration: "Yusuf" has no honorific after it']);
  });

  it('skips values that are not strings, arrays or objects', () => {
    expect(checkHonorificsInJson('y.json', { audio: null, order: 3, draft: true, missing: undefined, scenes: [null, 7] })).toEqual([]);
  });
});
