import { HunkExtensionUserError } from 'hunkdiff/extension';

import type { GitLabProject } from './utils/parseGitLabProject.ts';
import parseGitLabRemote from './utils/parseGitLabRemote.ts';

export type ReadOrigin = (cwd: string, signal: AbortSignal) => Promise<string>;

interface ResolveProjectOptions {
  /** The project the user named, if any. */
  readonly project?: GitLabProject;
  readonly cwd: string;
  readonly signal: AbortSignal;
  readonly readOrigin: ReadOrigin;
}

/**
 * Picks the project of a merge request: the one the user named, or else the
 * gitlab.com project of the checkout's origin.
 *
 * @param options - The named project, the directory, the signal and the way to
 *   read the origin.
 * @returns The project.
 * @throws {HunkExtensionUserError} When the origin cannot be read or is not a
 *   gitlab.com project.
 */
const resolveProject = async ({
  project,
  cwd,
  signal,
  readOrigin,
}: ResolveProjectOptions): Promise<GitLabProject> => {
  if (project !== undefined) {
    return project;
  }
  const originProject = parseGitLabRemote(await readOrigin(cwd, signal));
  if (originProject === null) {
    throw new HunkExtensionUserError(
      'The local origin is not a supported gitlab.com project.',
      { suggestions: ['Pass `--repo group/project` explicitly.'] },
    );
  }
  return originProject;
};

export default resolveProject;
