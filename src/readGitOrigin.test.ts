import { execFileSync } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import readGitOrigin from './readGitOrigin.ts';

const ORIGIN = 'git@gitlab.com:gitlab-org/cli.git';

describe('readGitOrigin', () => {
  let directory = '';

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'hunk-glab-origin-'));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });

  it('reads the origin of the checkout', async () => {
    execFileSync('git', ['init', '--quiet'], { cwd: directory });
    execFileSync('git', ['remote', 'add', 'origin', ORIGIN], {
      cwd: directory,
    });

    expect(await readGitOrigin(directory, new AbortController().signal)).toBe(
      ORIGIN,
    );
  });

  it('says the checkout has no origin', async () => {
    execFileSync('git', ['init', '--quiet'], { cwd: directory });

    await expect(
      readGitOrigin(directory, new AbortController().signal),
    ).rejects.toMatchObject({
      message: 'The current checkout has no readable Git origin.',
      suggestions: ['Pass `--repo group/project` explicitly.'],
    });
  });

  it('says so outside a checkout', async () => {
    await expect(
      readGitOrigin(directory, new AbortController().signal),
    ).rejects.toMatchObject({
      message: 'The current checkout has no readable Git origin.',
    });
  });

  it('says Git is missing', async () => {
    vi.stubEnv('PATH', '');

    await expect(
      readGitOrigin(directory, new AbortController().signal),
    ).rejects.toMatchObject({
      message: 'Git is unavailable while reading the current origin.',
    });
  });

  it('starts no Git for a cancelled run', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubEnv('PATH', '');

    await expect(
      readGitOrigin(directory, controller.signal),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
  });

  it.skipIf(process.platform === 'win32')(
    'reports a cancel while Git runs as cancelled',
    async () => {
      const fakeGit = join(directory, 'git');
      await writeFile(fakeGit, '#!/bin/sh\nsleep 5\n');
      await chmod(fakeGit, 0o755);
      vi.stubEnv('PATH', directory);
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort();
      }, 50);

      await expect(
        readGitOrigin(directory, controller.signal),
      ).rejects.toMatchObject({
        message: 'GitLab diff loading was cancelled.',
      });
    },
  );
});
