import { HunkExtensionUserError } from 'hunkdiff/extension';

import fetchGitLab, {
  type GitLabEnv,
  type GitLabFetch,
} from './fetchGitLab.ts';
import buildPatch from './utils/buildPatch.ts';
import encodeProject from './utils/encodeProject.ts';
import type { GitLabProject } from './utils/parseGitLabProject.ts';
import parseJsonBody from './utils/parseJsonBody.ts';

const MAX_DIFF_BYTES = 64 * 1024 * 1024;
const FILES_PER_PAGE = 100;
/** GitLab stops a commit diff at this many files by default, without a sign. */
const MAX_FILES = 1000;
const MALFORMED = 'GitLab returned malformed diff data.';
const TOO_LARGE = 'The GitLab diff exceeds the 64 MiB safety limit.';

interface FetchCommitDiffOptions {
  readonly project: GitLabProject;
  /** The full SHA from the commit metadata. */
  readonly revision: string;
  /** What is requested, for messages: `group/project@sha`. */
  readonly name: string;
  readonly signal: AbortSignal;
  readonly fetch: GitLabFetch;
  readonly env: GitLabEnv;
  /** All pages together; only tests set it lower. */
  readonly maxBytes?: number;
}

/**
 * Fetches the file diffs of a commit page by page and builds one patch. GitLab
 * cuts a commit diff off at 1,000 files without saying so, so a diff that
 * reaches that many files is refused rather than shown as complete.
 *
 * @param options - The commit, the transport and the byte limit.
 * @returns The patch.
 * @throws {HunkExtensionUserError} When the commit is unknown, the diff is
 *   empty, too large, possibly cut off, or malformed, or a request fails.
 */
const fetchCommitDiff = async ({
  project,
  revision,
  name,
  signal,
  fetch,
  env,
  maxBytes = MAX_DIFF_BYTES,
}: FetchCommitDiffOptions): Promise<Uint8Array> => {
  const files: unknown[] = [];
  let usedBytes = 0;
  for (let page = 1; ; page += 1) {
    const bytes = await fetchGitLab({
      apiPath: `projects/${encodeProject(project)}/repository/commits/${revision}/diff?per_page=${String(FILES_PER_PAGE)}&page=${String(page)}`,
      accept: 'application/json',
      name,
      maxBytes: maxBytes - usedBytes,
      tooLargeMessage: TOO_LARGE,
      emptyMessage: MALFORMED,
      notFoundMessage: `GitLab could not find an accessible commit at ${name}.`,
      signal,
      fetch,
      env,
    });
    usedBytes += bytes.byteLength;
    const batch = parseJsonBody(bytes, MALFORMED);
    if (!Array.isArray(batch)) {
      throw new HunkExtensionUserError(MALFORMED);
    }
    files.push(...(batch as unknown[]));
    if (files.length >= MAX_FILES) {
      throw new HunkExtensionUserError(
        `The GitLab diff of ${name} has 1,000 or more files, so it may be incomplete.`,
      );
    }
    if (batch.length < FILES_PER_PAGE) {
      break;
    }
  }

  const patch = new TextEncoder().encode(buildPatch(files));
  if (patch.byteLength === 0) {
    throw new HunkExtensionUserError('GitLab returned an empty diff.');
  }
  if (patch.byteLength > maxBytes) {
    throw new HunkExtensionUserError(TOO_LARGE);
  }
  return patch;
};

export default fetchCommitDiff;
