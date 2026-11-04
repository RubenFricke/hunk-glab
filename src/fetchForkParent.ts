import { HunkExtensionUserError } from 'hunkdiff/extension';

import fetchGitLab, {
  type GitLabEnv,
  type GitLabFetch,
} from './fetchGitLab.ts';
import describeProject from './utils/describeProject.ts';
import encodeProject from './utils/encodeProject.ts';
import isRecord from './utils/isRecord.ts';
import type { GitLabProject } from './utils/parseGitLabProject.ts';
import parseJsonBody from './utils/parseJsonBody.ts';

const MAX_PROJECT_BYTES = 1024 * 1024;
const MALFORMED = 'GitLab returned malformed project metadata.';

interface FetchForkParentOptions {
  readonly project: GitLabProject;
  readonly signal: AbortSignal;
  readonly fetch: GitLabFetch;
  readonly env: GitLabEnv;
}

/**
 * Finds the project a fork was forked from. GitLab only lists the merge
 * requests that target a project, so the merge request of a fork's branch lives
 * in that parent.
 *
 * @param options - The project and the transport.
 * @returns The parent project, or undefined when the project is no fork.
 * @throws {HunkExtensionUserError} When the request fails or the metadata is
 *   malformed.
 */
const fetchForkParent = async ({
  project,
  signal,
  fetch,
  env,
}: FetchForkParentOptions): Promise<GitLabProject | undefined> => {
  const bytes = await fetchGitLab({
    apiPath: `projects/${encodeProject(project)}`,
    accept: 'application/json',
    name: describeProject(project),
    maxBytes: MAX_PROJECT_BYTES,
    tooLargeMessage: 'GitLab project metadata exceeds the 1 MiB safety limit.',
    emptyMessage: 'GitLab returned empty project metadata.',
    signal,
    fetch,
    env,
  });
  const metadata = parseJsonBody(bytes, MALFORMED);
  if (!isRecord(metadata)) {
    throw new HunkExtensionUserError(MALFORMED);
  }
  const parent = metadata.forked_from_project;
  if (parent === undefined || parent === null) {
    return undefined;
  }
  const id = isRecord(parent) ? parent.id : undefined;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    throw new HunkExtensionUserError(MALFORMED);
  }
  return { kind: 'id', id };
};

export default fetchForkParent;
