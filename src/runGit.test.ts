import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import runGit from './runGit.ts';

describe('runGit', () => {
  let repo = '';

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'hunk-glab-git-'));
    execFileSync('git', ['init', '--quiet'], { cwd: repo });
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  it('returns the trimmed output of one Git command', async () => {
    expect(
      await runGit(
        repo,
        ['rev-parse', '--is-inside-work-tree'],
        new AbortController().signal,
      ),
    ).toBe('true');
  });

  it('passes arguments to Git without a shell', async () => {
    execFileSync('git', ['remote', 'add', 'origin', 'https://gitlab.com/a/b'], {
      cwd: repo,
    });

    await expect(
      runGit(
        repo,
        ['remote', 'get-url', 'origin; echo hacked'],
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 2 });
  });

  it('rejects when Git fails', async () => {
    await expect(
      runGit(
        repo,
        ['remote', 'get-url', 'origin'],
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 2 });
  });

  it('does not start Git for a cancelled run', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      runGit(repo, ['status'], controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
