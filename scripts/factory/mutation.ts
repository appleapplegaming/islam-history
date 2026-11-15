// Pure helpers for scripts/factory/mutate-changed.ts. No Node imports, so tests/ can type-check it.

/**
 * Files Stryker may mutate: game logic, pure script modules in scripts/lib/, and the factory's own
 * pure rules. Keep in sync with stryker.config.mjs. Script entry points (IO wrappers) are not mutated.
 */
export const MUTABLE_FILE = /^(src\/(systems|content)\/.+|scripts\/lib\/.+|scripts\/factory\/(guard-rules|tickets|bash-policy|mutation))\.ts$/;

export interface LineRange {
  start: number;
  end: number;
}

/**
 * Lines added or changed per file in a `git diff -U0` (new-side line numbers), keeping only files
 * Stryker may mutate. Deleted-only hunks have nothing to mutate and are skipped.
 */
export function changedLineRanges(diffText: string): Map<string, LineRange[]> {
  const ranges = new Map<string, LineRange[]>();
  let path: string | undefined;
  let inHunk = false;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('diff --git ')) {
      inHunk = false; // file headers only come before a file's first hunk
      continue;
    }
    if (!inHunk && line.startsWith('+++ ')) {
      path = /^\+\+\+ b\/(.+)$/.exec(line)?.[1]; // undefined for a deleted file (+++ /dev/null)
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk) inHunk = true;
    if (!hunk || path === undefined || !MUTABLE_FILE.test(path)) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    if (count === 0) continue;
    const list = ranges.get(path) ?? [];
    list.push({ start, end: start + count - 1 });
    ranges.set(path, list);
  }
  return ranges;
}

/** Stryker `--mutate` arguments (`file:start-end`) for the given ranges. */
export function mutateArgs(ranges: Map<string, LineRange[]>): string[] {
  return [...ranges].flatMap(([path, list]) => list.map(({ start, end }) => `${path}:${start}-${end}`));
}

interface MutantResult {
  status: string;
  location: { start: { line: number } };
  mutatorName: string;
  replacement?: string;
}

export interface MutationReport {
  files: Record<string, { mutants: MutantResult[] }>;
}

export interface MutationSummary {
  /** Killed (or timed out) mutants as a percentage of all valid mutants; 100 when there are none. */
  score: number;
  total: number;
  /** One line per mutant no test noticed, for the review brief. */
  undetected: string[];
}

const DETECTED = new Set(['Killed', 'Timeout']);
const UNDETECTED = new Set(['Survived', 'NoCoverage']);

/** Summarises a Stryker JSON report (mutation-testing-report-schema). */
export function summariseMutationReport(report: MutationReport): MutationSummary {
  let detected = 0;
  const undetected: string[] = [];
  for (const [path, { mutants }] of Object.entries(report.files)) {
    for (const mutant of mutants) {
      if (DETECTED.has(mutant.status)) detected++;
      else if (UNDETECTED.has(mutant.status)) {
        const change = mutant.replacement === undefined ? '' : ` -> ${mutant.replacement.split('\n')[0]}`;
        undetected.push(`${path}:${mutant.location.start.line} ${mutant.status} ${mutant.mutatorName}${change}`);
      }
    }
  }
  const total = detected + undetected.length;
  return { score: total === 0 ? 100 : Math.round((detected / total) * 1000) / 10, total, undetected };
}
