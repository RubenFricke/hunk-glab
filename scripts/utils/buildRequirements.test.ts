import { describe, expect, it } from 'vitest';

import buildRequirements from './buildRequirements.ts';

const REPOSITORY = 'RubenFricke/hunk-glab';
const CURRENT = { hunkVersion: '0.24.0', apiVersion: 31 };

describe('buildRequirements', () => {
  it('states the minimum Hunk for the first release', () => {
    expect(
      buildRequirements({
        repository: REPOSITORY,
        current: CURRENT,
        previous: null,
      }),
    ).toBe('## Requirements\n\nHunk 0.24.0 or newer (extension API 31).\n');
  });

  it('says nothing more when the minimum stays the same', () => {
    expect(
      buildRequirements({
        repository: REPOSITORY,
        current: CURRENT,
        previous: { tag: 'v0.1.0', hunkVersion: '0.24.0' },
      }),
    ).toBe('## Requirements\n\nHunk 0.24.0 or newer (extension API 31).\n');
  });

  it('names the previous release when the minimum goes up', () => {
    expect(
      buildRequirements({
        repository: REPOSITORY,
        current: { hunkVersion: '0.25.0', apiVersion: 33 },
        previous: { tag: 'v0.1.3', hunkVersion: '0.24.0' },
      }),
    ).toBe(
      [
        '## Requirements',
        '',
        'Hunk 0.25.0 or newer (extension API 33).',
        '',
        'Raises the minimum from Hunk 0.24.0. On an older Hunk, stay on v0.1.3: `hunk extension install RubenFricke/hunk-glab@v0.1.3`.',
        '',
      ].join('\n'),
    );
  });

  it('compares versions by number, not by text', () => {
    const notes = buildRequirements({
      repository: REPOSITORY,
      current: { hunkVersion: '0.10.0', apiVersion: 40 },
      previous: { tag: 'v0.4.0', hunkVersion: '0.9.0' },
    });

    expect(notes).toContain('Raises the minimum from Hunk 0.9.0.');
  });

  it('says nothing more when the minimum goes down', () => {
    const notes = buildRequirements({
      repository: REPOSITORY,
      current: CURRENT,
      previous: { tag: 'v0.2.0', hunkVersion: '0.25.0' },
    });

    expect(notes).not.toContain('Raises the minimum');
  });
});
