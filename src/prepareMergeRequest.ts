import type { ExtensionCliCommandContext } from 'hunkdiff/extension';

import fetchGitLab, { type GitLabFetch } from './fetchGitLab.ts';
import buildInvocationError from './utils/buildInvocationError.ts';
import describeMergeRequest from './utils/describeMergeRequest.ts';
import encodeProject from './utils/encodeProject.ts';
import parseMergeRequestInvocation from './utils/parseMergeRequestInvocation.ts';

const MAX_DIFF_BYTES = 64 * 1024 * 1024;

/** What `hunk glab mr` needs from outside the process. */
export interface MergeRequestDependencies {
  readonly fetch: GitLabFetch;
}

interface PrepareMergeRequestOptions {
  /** The tokens after `hunk glab mr`. */
  readonly args: readonly string[];
  readonly ctx: Pick<ExtensionCliCommandContext, 'signal' | 'stderr'>;
  readonly dependencies: MergeRequestDependencies;
}

/** A fetched diff, ready to hand to `hunk patch`. */
export interface PreparedDiff {
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly patchArgs: readonly string[];
}

/**
 * Resolves one `hunk glab mr` invocation and fetches the diff of its merge
 * request.
 *
 * @param options - The arguments, the command context and the dependencies.
 * @returns The diff and the options for `hunk patch`.
 * @throws {HunkExtensionUserError} When the invocation is invalid or GitLab
 *   does not return the diff.
 */
const prepareMergeRequest = async ({
  args,
  ctx,
  dependencies,
}: PrepareMergeRequestOptions): Promise<PreparedDiff> => {
  const { iid, project, patchArgs } = parseMergeRequestInvocation(args);
  if (project === undefined) {
    throw buildInvocationError('Pass the project with --repo group/project.');
  }

  const target = { project, iid };
  const name = describeMergeRequest(target);
  await ctx.stderr.write(`Fetching GitLab merge request ${name}…\n`);
  const bytes = await fetchGitLab({
    apiPath: `projects/${encodeProject(project)}/merge_requests/${String(iid)}/raw_diffs`,
    accept: 'text/plain',
    name,
    maxBytes: MAX_DIFF_BYTES,
    tooLargeMessage: 'The GitLab diff exceeds the 64 MiB safety limit.',
    emptyMessage: 'GitLab returned an empty diff.',
    signal: ctx.signal,
    fetch: dependencies.fetch,
  });
  const projectName = project.path.split('/').at(-1) ?? 'project';
  return {
    bytes,
    filename: `${projectName}-mr-${String(iid)}.diff`,
    patchArgs,
  };
};

export default prepareMergeRequest;
