export interface Manifest {
  readonly version: string;
  /** The exact hunkdiff pin: the oldest Hunk that hunk-glab supports. */
  readonly hunkVersion: string;
  readonly apiVersion: number;
}

const EXACT_VERSION = /^\d+\.\d+\.\d+$/;

/**
 * Reads what the release and the README state about Hunk from package.json. The
 * hunkdiff pin has to be exact, because CI tests that very version as the
 * minimum; a range would leave the stated minimum untested.
 */
const parseManifest = (text: string): Manifest => {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  const manifest: unknown = JSON.parse(text);
  if (!isRecord(manifest) || typeof manifest.version !== 'string') {
    throw new Error('package.json has no version.');
  }
  const hunkVersion = isRecord(manifest.devDependencies)
    ? manifest.devDependencies.hunkdiff
    : undefined;
  if (typeof hunkVersion !== 'string' || !EXACT_VERSION.test(hunkVersion)) {
    throw new Error('package.json must pin hunkdiff to an exact version.');
  }
  const apiVersion = isRecord(manifest.hunk)
    ? manifest.hunk.apiVersion
    : undefined;
  if (typeof apiVersion !== 'number') {
    throw new Error('package.json has no hunk.apiVersion.');
  }
  return { version: manifest.version, hunkVersion, apiVersion };
};

export default parseManifest;
