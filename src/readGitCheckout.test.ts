import { execFileSync } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import readGitCheckout from './readGitCheckout.ts';

const SIGNAL = new AbortController().signal;

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

describe('readGitCheckout', () => {
  let repo = '';

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'hunk-glab-checkout-'));
    git(repo, 'init', '--quiet', '--initial-branch', 'feature/x');
    git(
      repo,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '--quiet',
      '--allow-empty',
      '-m',
      'first',
    );
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(repo, { recursive: true, force: true });
  });

  it('reads the branch and the exact HEAD', async () => {
    expect(await readGitCheckout(repo, SIGNAL)).toEqual({
      branch: 'feature/x',
      sha: git(repo, 'rev-parse', 'HEAD'),
    });
  });

  it('reads the pushed upstream when HEAD is ahead of it', async () => {
    const remote = join(repo, 'remote.git');
    git(repo, 'init', '--quiet', '--bare', remote);
    git(repo, 'remote', 'add', 'origin', remote);
    git(repo, 'push', '--quiet', '--set-upstream', 'origin', 'feature/x');
    const pushed = git(repo, 'rev-parse', 'HEAD');
    git(
      repo,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '--quiet',
      '--allow-empty',
      '-m',
      'local',
    );

    expect(await readGitCheckout(repo, SIGNAL)).toEqual({
      branch: 'feature/x',
      sha: git(repo, 'rev-parse', 'HEAD'),
      upstreamSha: pushed,
    });
  });

  it('says a detached HEAD cannot name its merge request', async () => {
    git(repo, 'checkout', '--quiet', '--detach');

    await expect(readGitCheckout(repo, SIGNAL)).rejects.toMatchObject({
      message:
        'The current checkout has a detached HEAD, so its merge request cannot be inferred.',
      suggestions: [
        'Check out a branch or pass a merge-request number, group/project!123, or URL.',
      ],
    });
  });

  it('says a branch without commits has no HEAD', async () => {
    git(repo, 'checkout', '--quiet', '--orphan', 'empty');

    await expect(readGitCheckout(repo, SIGNAL)).rejects.toMatchObject({
      message: 'Git failed while reading the current HEAD.',
    });
  });

  it('says Git is missing', async () => {
    vi.stubEnv('PATH', '');

    await expect(readGitCheckout(repo, SIGNAL)).rejects.toMatchObject({
      message: 'Git is unavailable while reading the current branch.',
    });
  });

  it.skipIf(process.platform === 'win32')(
    'rejects a branch name with control characters',
    async () => {
      const bin = join(repo, 'bin');
      execFileSync('mkdir', [bin]);
      await writeFile(join(bin, 'git'), "#!/bin/sh\nprintf 'a\\033[2Jb\\n'\n");
      await chmod(join(bin, 'git'), 0o755);
      vi.stubEnv('PATH', bin);

      await expect(readGitCheckout(repo, SIGNAL)).rejects.toMatchObject({
        message:
          'The current Git branch contains terminal control characters and cannot be used for merge-request discovery.',
      });
    },
  );

  it('starts no Git for a cancelled run', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubEnv('PATH', '');

    await expect(
      readGitCheckout(repo, controller.signal),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
  });

  describe('with a fake git', () => {
    /** PATH holds only the fake, so it calls other tools by full path. */
    const useFakeGit = async (script: string): Promise<void> => {
      const bin = join(repo, 'bin');
      execFileSync('mkdir', ['-p', bin]);
      await writeFile(join(bin, 'git'), `#!/bin/sh\n${script}\n`);
      await chmod(join(bin, 'git'), 0o755);
      vi.stubEnv('PATH', bin);
    };

    it.skipIf(process.platform === 'win32')(
      'reports a cancel while Git runs as cancelled',
      async () => {
        await useFakeGit('exec /bin/sleep 5');
        const controller = new AbortController();
        setTimeout(() => {
          controller.abort();
        }, 50);

        await expect(
          readGitCheckout(repo, controller.signal),
        ).rejects.toMatchObject({
          message: 'GitLab diff loading was cancelled.',
        });
      },
    );

    it.skipIf(process.platform === 'win32')(
      'rejects a HEAD that is not a full SHA',
      async () => {
        await useFakeGit(
          'if [ "$1" = symbolic-ref ]; then echo main; else echo abc123; fi',
        );

        await expect(readGitCheckout(repo, SIGNAL)).rejects.toMatchObject({
          message: 'Git failed while reading the current HEAD.',
        });
      },
    );
  });
});
