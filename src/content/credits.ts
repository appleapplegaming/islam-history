/**
 * Returns each asset path (relative to the repo root, e.g. "assets/icon.svg") that is not
 * mentioned in assets/CREDITS.md. Every asset must be listed there with its licence.
 */
export function findUncreditedAssets(assetPaths: readonly string[], creditsText: string): string[] {
  return assetPaths.filter((path) => !creditsText.includes(path));
}
