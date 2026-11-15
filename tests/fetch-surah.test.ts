import { describe, expect, it } from 'vitest';
import { fetchSurah, type FetchSurahInput } from '../scripts/lib/fetch-surah.ts';

const input: FetchSurahInput = {
  surah: 12,
  expectedAyat: 2,
  fileName: 'surah-012.json',
  arabicUrl: 'https://example.test/ar',
  translationUrl: 'https://example.test/en',
};
const sources: Record<string, string> = {
  'https://example.test/ar': '12|1|AR one\n12|2|AR two\n# Licence\n',
  'https://example.test/en': '12|1|EN one\n12|2|EN two\n',
};

function harness(overrides: Record<string, string | Error> = {}) {
  const written: [string, string][] = [];
  return {
    written,
    deps: {
      download: (url: string): Promise<string> => {
        const body = overrides[url] ?? sources[url];
        if (body instanceof Error) return Promise.reject(body);
        return body === undefined ? Promise.reject(new Error(`unexpected ${url}`)) : Promise.resolve(body);
      },
      write: (name: string, content: string): Promise<void> => {
        written.push([name, content]);
        return Promise.resolve();
      },
    },
  };
}

describe('fetchSurah', () => {
  it('writes the surah JSON and the licence, and returns the ayah count', async () => {
    const { written, deps } = harness();
    expect(await fetchSurah(input, deps)).toBe(2);
    expect(written.map(([name]) => name)).toEqual(['surah-012.json', 'LICENSE']);
    expect(written[1]?.[1]).toBe('Licence\n');
    expect(JSON.parse(written[0]?.[1] ?? '')).toEqual({
      surah: 12,
      ayat: [
        { number: 1, arabic: 'AR one', translation: 'EN one' },
        { number: 2, arabic: 'AR two', translation: 'EN two' },
      ],
    });
  });

  it('appends the translation licence after the Arabic one when the translation has its own', async () => {
    const { written, deps } = harness({
      'https://example.test/en': '12|1|EN one\n12|2|EN two\n# Translation terms\n',
    });
    await fetchSurah(input, deps);
    expect(written[1]?.[1]).toBe('Licence\n\nTranslation terms\n');
  });

  it('produces byte-identical output when run twice', async () => {
    const first = harness();
    const second = harness();
    await fetchSurah(input, first.deps);
    await fetchSurah(input, second.deps);
    expect(second.written).toEqual(first.written);
  });

  it('writes nothing when a download fails', async () => {
    const { written, deps } = harness({ 'https://example.test/en': new Error('Download failed (503)') });
    await expect(fetchSurah(input, deps)).rejects.toThrow(/Download failed \(503\)/);
    expect(written).toEqual([]);
  });

  it('writes nothing when the ayah count is wrong', async () => {
    const { written, deps } = harness();
    await expect(fetchSurah({ ...input, expectedAyat: 111 }, deps)).rejects.toThrow(/expected 111 ayat/);
    expect(written).toEqual([]);
  });

  it('writes nothing when the licence notice is missing', async () => {
    const { written, deps } = harness({ 'https://example.test/ar': '12|1|AR one\n12|2|AR two\n' });
    await expect(fetchSurah(input, deps)).rejects.toThrow(/licence/);
    expect(written).toEqual([]);
  });
});
