// Content validation: `npm run validate`. Must pass before every commit.
// File IO only; the checks themselves live in src/content/validate.ts and are unit-tested.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { findDisallowedArabic, validateChapter } from '../src/content/validate.ts';

const ROOT = join(import.meta.dirname, '..');
const QURAN_DIR = join(ROOT, 'data', 'quran');
const CHAPTERS_DIR = join(ROOT, 'content', 'chapters');
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

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('Validation passed.');
