import type {
  ExtensionChangeRequestReviewDescriptor,
  ExtensionCliCommandContext,
} from 'hunkdiff/extension';

import fetchGitLab, {
  type GitLabEnv,
  type GitLabFetch,
} from './fetchGitLab.ts';
import fetchMergeRequestMetadata from './fetchMergeRequestMetadata.ts';
import findOpenMergeRequest from './findOpenMergeRequest.ts';
import type { GitCheckout } from './readGitCheckout.ts';
import resolveProject, { type ReadOrigin } from './resolveProject.ts';
import describeMergeRequest from './utils/describeMergeRequest.ts';
import encodeProject from './utils/encodeProject.ts';
import parseMergeRequestInvocation from './utils/parseMergeRequestInvocation.ts';

const MAX_DIFF_BYTES = 64 * 1024 * 1024;

/** What `hunk glab mr` needs from outside the process. */
export interface MergeRequestDependencies {
  readonly fetch: GitLabFetch;
  readonly env: GitLabEnv;
  readonly readOrigin: ReadOrigin;
  readonly readCheckout: (
    cwd: string,
    signal: AbortSignal,
  ) => Promise<GitCheckout>;
}

interface PrepareMergeRequestOptions {
  /** The tokens after `hunk glab mr`. */
  readonly args: readonly string[];
  readonly ctx: Pick<ExtensionCliCommandContext, 'cwd' | 'signal' | 'stderr'>;
  readonly dependencies: MergeRequestDependencies;
}

/** A fetched diff, ready to hand to `hunk patch`. */
interface PreparedDiff {
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly patchArgs: readonly string[];
  /** The header Hunk shows above the review. */
  readonly review: ExtensionChangeRequestReviewDescriptor;
}

/**
 * Resolves one `hunk glab mr` invocation, finding the merge request from HEAD
 * when no number was given, and fetches its metadata and diff.
 *
 * @param options - The arguments, the command context and the dependencies.
 * @returns The diff, the review header and the options for `hunk patch`.
 * @throws {HunkExtensionUserError} When the invocation is invalid or GitLab
 *   does not return the diff.
 */
const prepareMergeRequest = async ({
  args,
  ctx,
  dependencies,
}: PrepareMergeRequestOptions): Promise<PreparedDiff> => {
  const invocation = parseMergeRequestInvocation(args);
  const { patchArgs } = invocation;
  const project = await resolveProject({
    project: invocation.project,
    cwd: ctx.cwd,
    signal: ctx.signal,
    readOrigin: dependencies.readOrigin,
  });
  const target =
    invocation.iid === undefined
      ? await findOpenMergeRequest({
          project,
          checkout: await dependencies.readCheckout(ctx.cwd, ctx.signal),
          signal: ctx.signal,
          fetch: dependencies.fetch,
          env: dependencies.env,
        })
      : { project, iid: invocation.iid };
  const name = describeMergeRequest(target);
  await ctx.stderr.write(`Fetching GitLab merge request ${name}…\n`);
  const review = await fetchMergeRequestMetadata({
    target,
    signal: ctx.signal,
    fetch: dependencies.fetch,
    env: dependencies.env,
  });
  const bytes = await fetchGitLab({
    apiPath: `projects/${encodeProject(target.project)}/merge_requests/${String(target.iid)}/raw_diffs`,
    accept: 'text/plain',
    name,
    maxBytes: MAX_DIFF_BYTES,
    tooLargeMessage: 'The GitLab diff exceeds the 64 MiB safety limit.',
    emptyMessage: 'GitLab returned an empty diff.',
    signal: ctx.signal,
    fetch: dependencies.fetch,
    env: dependencies.env,
  });
  /** The header names the project by path, also when the user gave an id. */
  const projectName = review.repository?.split('/').at(-1) ?? 'project';
  return {
    bytes,
    filename: `${projectName}-mr-${String(target.iid)}.diff`,
    patchArgs,
    review,
  };
};

export default prepareMergeRequest;
