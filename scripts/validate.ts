// Content validation: `npm run validate`. Must pass before every commit.
// File IO only; the checks themselves live in src/content/validate.ts and are unit-tested.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { findUncreditedAssets } from '../src/content/credits.ts';
import { checkHonorificsInJson } from '../src/content/honorifics.ts';
import { findDisallowedArabic, validateChapter } from '../src/content/validate.ts';

const ROOT = join(import.meta.dirname, '..');
const QURAN_DIR = join(ROOT, 'data', 'quran');
const CONTENT_DIR = join(ROOT, 'content');
const CHAPTERS_DIR = join(CONTENT_DIR, 'chapters');
const ASSETS_DIR = join(ROOT, 'assets');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);
const TEXT_EXTENSIONS = ['.ts', '.json', '.md', '.html', '.css', '.svg', '.txt'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name) && path !== QURAN_DIR) walk(path, out);
    } else if (TEXT_EXTENSIONS.some((ext) => name.endsWith(ext)) && name !== 'package-lock.json') {
      out.push(path);
    }
  }
  return out;
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse ${relative(ROOT, path)}: ${(error as Error).message}`);
  }
}

/** Reads data/quran/surah-NNN.json files into surah -> ayah count. */
function loadQuranIndex(): Map<number, number> {
  const index = new Map<number, number>();
  if (!existsSync(QURAN_DIR)) return index;
  for (const name of readdirSync(QURAN_DIR)) {
    if (!/^surah-\d{3}\.json$/.test(name)) continue;
    const data = readJson(join(QURAN_DIR, name)) as { surah: number; ayat: unknown[] };
    index.set(data.surah, data.ayat.length);
  }
  return index;
}

const errors: string[] = [];

for (const file of walk(ROOT)) {
  const found = findDisallowedArabic(readFileSync(file, 'utf8'));
  if (found.length > 0) {
    errors.push(`${relative(ROOT, file)}: Arabic text outside data/quran/ (${found.slice(0, 3).join(' | ')})`);
  }
}

const index = loadQuranIndex();
if (existsSync(CHAPTERS_DIR)) {
  for (const name of readdirSync(CHAPTERS_DIR).filter((n) => n.endsWith('.json'))) {
    const path = join(CHAPTERS_DIR, name);
    errors.push(...validateChapter(relative(ROOT, path).split(sep).join('/'), readJson(path), index));
  }
}

// Honorifics: every prophet name in story content is followed by its honorific.
if (existsSync(CONTENT_DIR)) {
  for (const path of walk(CONTENT_DIR).filter((p) => p.endsWith('.json'))) {
    errors.push(...checkHonorificsInJson(relative(ROOT, path).split(sep).join('/'), readJson(path)));
  }
}

// Credits: every asset file is listed with its licence in assets/CREDITS.md.
if (existsSync(ASSETS_DIR)) {
  const credits = existsSync(join(ASSETS_DIR, 'CREDITS.md')) ? readFileSync(join(ASSETS_DIR, 'CREDITS.md'), 'utf8') : '';
  const assets: string[] = [];
  const collect = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) collect(path);
      else if (name !== 'CREDITS.md' && name !== '.DS_Store') assets.push(relative(ROOT, path).split(sep).join('/'));
    }
  };
  collect(ASSETS_DIR);
  for (const path of findUncreditedAssets(assets, credits)) errors.push(`${path}: not listed in assets/CREDITS.md`);
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('Validation passed.');
