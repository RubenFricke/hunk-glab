import { describe, expect, it } from 'vitest';

import parseManifest from './parseManifest.ts';

const manifestText = (
  overrides: Record<string, unknown> = {},
  hunkdiff: unknown = '0.24.0',
): string =>
  JSON.stringify({
    name: 'hunk-glab',
    version: '0.1.0',
    hunk: { apiVersion: 31, extensions: ['./src/index.ts'] },
    devDependencies: { hunkdiff, typescript: '~6.0.3' },
    ...overrides,
  });

describe('parseManifest', () => {
  it('reads the version, the hunkdiff pin and the extension API', () => {
    expect(parseManifest(manifestText())).toEqual({
      version: '0.1.0',
      hunkVersion: '0.24.0',
      apiVersion: 31,
    });
  });

  it('refuses a hunkdiff range', () => {
    expect(() => parseManifest(manifestText({}, '^0.24.0'))).toThrow(
      'package.json must pin hunkdiff to an exact version.',
    );
  });

  it('refuses a manifest without hunkdiff', () => {
    expect(() => parseManifest(manifestText({ devDependencies: {} }))).toThrow(
      'package.json must pin hunkdiff to an exact version.',
    );
  });

  it('refuses a manifest without hunk.apiVersion', () => {
    expect(() =>
      parseManifest(manifestText({ hunk: { extensions: [] } })),
    ).toThrow('package.json has no hunk.apiVersion.');
  });

  it('refuses a manifest without a version', () => {
    expect(() => parseManifest(manifestText({ version: undefined }))).toThrow(
      'package.json has no version.',
    );
  });
});
