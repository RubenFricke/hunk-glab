import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const GIT_TIMEOUT_MS = 5_000;
const MAX_GIT_OUTPUT_BYTES = 16 * 1024;

const execFileAsync = promisify(execFile);

/**
 * Runs one bounded Git query without a shell, so a path or ref never becomes
 * executable syntax.
 *
 * @param cwd - The directory to run Git in.
 * @param args - The Git arguments.
 * @param signal - Stops Git when the run is cancelled.
 * @returns The output, without surrounding whitespace.
 * @throws The `execFile` error when Git fails, is missing, times out or is
 *   cancelled.
 */
const runGit = async (
  cwd: string,
  args: readonly string[],
  signal: AbortSignal,
): Promise<string> => {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    signal,
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
  });
  return stdout.trim();
};

export default runGit;
