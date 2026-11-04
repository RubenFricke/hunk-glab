import { HunkExtensionUserError } from 'hunkdiff/extension';

import fetchForkParent from './fetchForkParent.ts';
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
 * on top of a pushed branch still finds its merge request. GitLab only lists
 * the merge requests that target a project, so for a fork without a match the
 * project it was forked from is searched too.
 *
 * @param options - The project, the checkout and the transport.
 * @returns The merge request.
 * @throws {HunkExtensionUserError} When GitLab does not know the commit, no or
 *   several open merge requests match, the matches go on to a next page, or the
 *   request fails.
 */
const findOpenMergeRequest = async ({
  project,
  checkout,
  signal,
  fetch,
  env,
}: FindOpenMergeRequestOptions): Promise<MergeRequestTarget> => {
  const { branch, sha, upstreamSha } = checkout;
  const commits =
    upstreamSha === undefined || upstreamSha === sha
      ? [sha]
      : [sha, upstreamSha];

  /** Returns the failure instead of throwing it, so a fork can try its parent. */
  const findIn = async (
    searched: GitLabProject,
  ): Promise<MergeRequestTarget | HunkExtensionUserError> => {
    const projectName = describeProject(searched);
    const describeCommit = (commit: string): string =>
      `${projectName}:${branch}@${commit.slice(0, SHORT_SHA_LENGTH)}`;
    const commitNotFound = (commit: string): string =>
      `GitLab could not find an accessible commit at ${projectName}@${commit}.`;

    /**
     * Throws for an unknown commit, several matches or a next page; returns
     * undefined when nothing matches.
     */
    const search = async (
      commit: string,
    ): Promise<MergeRequestTarget | undefined> => {
      const bytes = await fetchGitLab({
        apiPath: `projects/${encodeProject(searched)}/repository/commits/${commit}/merge_requests?state=opened&per_page=100`,
        accept: 'application/json',
        name: describeCommit(commit),
        maxBytes: MAX_MATCHES_BYTES,
        tooLargeMessage:
          'GitLab merge-request matches exceed the 1 MiB safety limit.',
        emptyMessage: 'GitLab returned empty merge-request matches.',
        notFoundMessage: commitNotFound(commit),
        nextPageMessage: `GitLab returned paginated merge-request matches for ${describeCommit(commit)}, so one merge request cannot be selected safely.`,
        signal,
        fetch,
        env,
      });
      const matches = parseMergeRequestMatches(
        parseJsonBody(
          bytes,
          'GitLab returned malformed merge-request matches.',
        ),
      );
      if (matches.length > 1) {
        throw new HunkExtensionUserError(
          `Multiple accessible open merge requests match ${describeCommit(commit)}.`,
          {
            suggestions: ['Pass the intended merge-request number explicitly.'],
          },
        );
      }
      return matches[0];
    };

    let failure = new HunkExtensionUserError('No commit was searched.');
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
    return failure;
  };

  const found = await findIn(project);
  if (!(found instanceof HunkExtensionUserError)) {
    return found;
  }
  const parent = await fetchForkParent({ project, signal, fetch, env });
  const foundInParent = parent === undefined ? found : await findIn(parent);
  if (foundInParent instanceof HunkExtensionUserError) {
    throw found;
  }
  return foundInParent;
};

export default findOpenMergeRequest;
