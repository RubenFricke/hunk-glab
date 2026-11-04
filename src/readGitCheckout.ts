import { HunkExtensionUserError } from 'hunkdiff/extension';

import runGit from './runGit.ts';
import buildCancelledError from './utils/buildCancelledError.ts';
import hasControlCharacter from './utils/hasControlCharacter.ts';

const FULL_SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/i;
/** `git symbolic-ref --quiet` exits with 1 when HEAD is not a branch. */
const DETACHED_HEAD_EXIT_CODE = 1;

/** The commit the checkout stands on, for finding its merge request. */
export interface GitCheckout {
  readonly branch: string;
  /** The full SHA of HEAD, in lowercase. */
  readonly sha: string;
}

/**
 * Reads the current branch and the exact commit of HEAD.
 *
 * @param cwd - The directory of the command.
 * @param signal - Stops Git when the run is cancelled.
 * @returns The branch and the SHA of HEAD.
 * @throws {HunkExtensionUserError} When the run is cancelled, Git is missing or
 *   fails, HEAD is detached, or the branch name has a control character.
 */
const readGitCheckout = async (
  cwd: string,
  signal: AbortSignal,
): Promise<GitCheckout> => {
  /** Read anew each time: the run can be cancelled while Git runs. */
  const isCancelled = (): boolean => signal.aborted;
  const read = async (
    args: readonly string[],
    subject: 'branch' | 'HEAD',
  ): Promise<string> => {
    if (isCancelled()) {
      throw buildCancelledError();
    }
    try {
      return await runGit(cwd, args, signal);
    } catch (error) {
      if (isCancelled()) {
        throw buildCancelledError();
      }
      const code =
        error instanceof Error && 'code' in error ? error.code : null;
      if (code === 'ENOENT') {
        throw new HunkExtensionUserError(
          `Git is unavailable while reading the current ${subject}.`,
        );
      }
      if (subject === 'branch' && code === DETACHED_HEAD_EXIT_CODE) {
        throw new HunkExtensionUserError(
          'The current checkout has a detached HEAD, so its merge request cannot be inferred.',
          {
            suggestions: [
              'Check out a branch or pass a merge-request number, group/project!123, or URL.',
            ],
          },
        );
      }
      const timedOut =
        error instanceof Error && 'killed' in error && error.killed === true;
      throw new HunkExtensionUserError(
        timedOut
          ? `Git timed out while reading the current ${subject}.`
          : `Git failed while reading the current ${subject}.`,
      );
    }
  };

  const branch = await read(
    ['symbolic-ref', '--quiet', '--short', 'HEAD'],
    'branch',
  );
  if (hasControlCharacter(branch)) {
    throw new HunkExtensionUserError(
      'The current Git branch contains terminal control characters and cannot be used for merge-request discovery.',
    );
  }
  const sha = await read(['rev-parse', '--verify', 'HEAD'], 'HEAD');
  if (!FULL_SHA.test(sha)) {
    throw new HunkExtensionUserError(
      'Git failed while reading the current HEAD.',
    );
  }
  return { branch, sha: sha.toLowerCase() };
};

export default readGitCheckout;
