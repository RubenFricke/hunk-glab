import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import parseManifest from '../scripts/utils/parseManifest.ts';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The README states the minimum Hunk in one place, by hand. CI tests the
 * hunkdiff pin as that minimum, so the two must not drift apart.
 */
describe('README', () => {
  it('states the minimum Hunk that package.json pins', async () => {
    const manifest = parseManifest(
      await readFile(join(PACKAGE_ROOT, 'package.json'), 'utf8'),
    );
    const readme = await readFile(join(PACKAGE_ROOT, 'README.md'), 'utf8');

    expect(readme).toContain(
      `Requires Hunk ${manifest.hunkVersion} or newer (extension API ${String(manifest.apiVersion)}).`,
    );
  });
});
