import { HunkExtensionUserError } from 'hunkdiff/extension';

import runGit from './runGit.ts';
import buildCancelledError from './utils/buildCancelledError.ts';

/**
 * Reads the origin remote of the checkout the command runs in.
 *
 * @param cwd - The directory of the command.
 * @param signal - Stops Git when the run is cancelled.
 * @returns The origin URL.
 * @throws {HunkExtensionUserError} When the run is cancelled, Git is missing,
 *   or the directory has no readable origin.
 */
const readGitOrigin = async (
  cwd: string,
  signal: AbortSignal,
): Promise<string> => {
  /** Read anew each time: the run can be cancelled while Git runs. */
  const isCancelled = (): boolean => signal.aborted;
  if (isCancelled()) {
    throw buildCancelledError();
  }
  try {
    const origin = await runGit(cwd, ['remote', 'get-url', 'origin'], signal);
    if (origin) {
      return origin;
    }
  } catch (error) {
    if (isCancelled()) {
      throw buildCancelledError();
    }
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new HunkExtensionUserError(
        'Git is unavailable while reading the current origin.',
      );
    }
  }
  throw new HunkExtensionUserError(
    'The current checkout has no readable Git origin.',
    { suggestions: ['Pass `--repo group/project` explicitly.'] },
  );
};

export default readGitOrigin;
