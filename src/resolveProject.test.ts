import { describe, expect, it } from 'vitest';

import resolveProject from './resolveProject.ts';

const SIGNAL = new AbortController().signal;

describe('resolveProject', () => {
  it('keeps a project the user named, without reading origin', async () => {
    const project = { kind: 'path', path: 'gitlab-org/cli' } as const;

    expect(
      await resolveProject({
        project,
        cwd: '/work',
        signal: SIGNAL,
        readOrigin: () => Promise.reject(new Error('origin must not be read')),
      }),
    ).toBe(project);
  });

  it('reads the project from the origin of the checkout', async () => {
    const reads: string[] = [];

    expect(
      await resolveProject({
        cwd: '/work',
        signal: SIGNAL,
        readOrigin: (cwd) => {
          reads.push(cwd);
          return Promise.resolve('git@gitlab.com:group/sub/project.git');
        },
      }),
    ).toEqual({ kind: 'path', path: 'group/sub/project' });
    expect(reads).toEqual(['/work']);
  });

  it('rejects an origin that is not a gitlab.com project', async () => {
    await expect(
      resolveProject({
        cwd: '/work',
        signal: SIGNAL,
        readOrigin: () =>
          Promise.resolve('git@github.com:RubenFricke/hunk-glab.git'),
      }),
    ).rejects.toMatchObject({
      message: 'The local origin is not a supported gitlab.com project.',
      suggestions: ['Pass `--repo group/project` explicitly.'],
    });
  });
});
