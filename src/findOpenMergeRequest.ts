import { HunkExtensionUserError } from 'hunkdiff/extension';

import fetchGitLab, {
  type GitLabEnv,
  type GitLabFetch,
} from './fetchGitLab.ts';
import type { GitCheckout } from './readGitCheckout.ts';
import type { MergeRequestTarget } from './utils/describeMergeRequest.ts';
import describeProject from './utils/describeProject.ts';
import encodeProject from './utils/encodeProject.ts';
import type { GitLabProject } from './utils/parseGitLabProject.ts';
import parseJsonBody from './utils/parseJsonBody.ts';
import parseMergeRequestMatches from './utils/parseMergeRequestMatches.ts';

const MAX_MATCHES_BYTES = 1024 * 1024;
const SHORT_SHA_LENGTH = 12;

interface FindOpenMergeRequestOptions {
  /** The project to search, whose merge requests target it. */
  readonly project: GitLabProject;
  readonly checkout: GitCheckout;
  readonly signal: AbortSignal;
  readonly fetch: GitLabFetch;
  readonly env: GitLabEnv;
}

/**
 * Finds the one open merge request that contains the exact commit of the
 * checkout. The commit decides, not the branch name, so another merge request
 * with the same branch name is never chosen. When GitLab does not know HEAD or
 * has no match for it, the pushed upstream gets one more try, so a local commit
 * on top of a pushed branch still finds its merge request.
 *
 * @param options - The project, the checkout and the transport.
 * @returns The merge request.
 * @throws {HunkExtensionUserError} When GitLab does not know the commit, no
 *   open merge request matches, or the request fails.
 */
const findOpenMergeRequest = async ({
  project,
  checkout,
  signal,
  fetch,
  env,
}: FindOpenMergeRequestOptions): Promise<MergeRequestTarget> => {
  const { branch, sha, upstreamSha } = checkout;
  const projectName = describeProject(project);
  const describeCommit = (commit: string): string =>
    `${projectName}:${branch}@${commit.slice(0, SHORT_SHA_LENGTH)}`;
  const commitNotFound = (commit: string): string =>
    `GitLab could not find an accessible commit at ${projectName}@${commit}.`;

  /** Throws for an unknown commit; returns undefined when nothing matches. */
  const search = async (
    commit: string,
  ): Promise<MergeRequestTarget | undefined> => {
    const bytes = await fetchGitLab({
      apiPath: `projects/${encodeProject(project)}/repository/commits/${commit}/merge_requests?state=opened&per_page=100`,
      accept: 'application/json',
      name: describeCommit(commit),
      maxBytes: MAX_MATCHES_BYTES,
      tooLargeMessage:
        'GitLab merge-request matches exceed the 1 MiB safety limit.',
      emptyMessage: 'GitLab returned empty merge-request matches.',
      notFoundMessage: commitNotFound(commit),
      signal,
      fetch,
      env,
    });
    const [match] = parseMergeRequestMatches(
      parseJsonBody(bytes, 'GitLab returned malformed merge-request matches.'),
    );
    return match;
  };

  const commits =
    upstreamSha === undefined || upstreamSha === sha
      ? [sha]
      : [sha, upstreamSha];
  let failure: HunkExtensionUserError | undefined;
  for (const commit of commits) {
    try {
      const match = await search(commit);
      if (match !== undefined) {
        return match;
      }
      failure = new HunkExtensionUserError(
        `No accessible open merge request matches ${describeCommit(commit)}.`,
        {
          suggestions: [
            'Pass a merge-request number, group/project!123, or URL explicitly.',
          ],
        },
      );
    } catch (error) {
      if (
        !(error instanceof HunkExtensionUserError) ||
        error.message !== commitNotFound(commit)
      ) {
        throw error;
      }
      failure = error;
    }
  }
  throw failure ?? new HunkExtensionUserError('No commit to search.');
};

export default findOpenMergeRequest;
