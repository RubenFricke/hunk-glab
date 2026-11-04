import fetchCommitDiff from './fetchCommitDiff.ts';
import fetchGitLab from './fetchGitLab.ts';
import type {
  PreparedDiff,
  PrepareDiffOptions,
} from './prepareMergeRequest.ts';
import resolveProject from './resolveProject.ts';
import describeProject from './utils/describeProject.ts';
import encodeProject from './utils/encodeProject.ts';
import parseCommitInvocation from './utils/parseCommitInvocation.ts';
import parseCommitMetadata from './utils/parseCommitMetadata.ts';
import parseJsonBody from './utils/parseJsonBody.ts';

const MAX_METADATA_BYTES = 1024 * 1024;

/**
 * Resolves one `hunk glab commit` invocation and fetches the metadata and the
 * diff of its commit. GitLab gives no patch for a commit, so the diff is built
 * from its file diffs.
 *
 * @param options - The arguments, the command context and the dependencies.
 * @returns The patch, the review header and the options for `hunk patch`.
 * @throws {HunkExtensionUserError} When the invocation is invalid, GitLab does
 *   not know the commit, or its diff is incomplete or too large.
 */
const prepareCommit = async ({
  args,
  ctx,
  dependencies,
}: PrepareDiffOptions): Promise<PreparedDiff> => {
  const invocation = parseCommitInvocation(args);
  const project = await resolveProject({
    project: invocation.project,
    cwd: ctx.cwd,
    signal: ctx.signal,
    readOrigin: dependencies.readOrigin,
  });
  const target = { project, sha: invocation.sha };
  const name = `${describeProject(project)}@${target.sha}`;
  const notFoundMessage = `GitLab could not find an accessible commit at ${name}.`;
  await ctx.stderr.write(`Fetching GitLab commit ${name}…\n`);

  const metadataBytes = await fetchGitLab({
    apiPath: `projects/${encodeProject(project)}/repository/commits/${target.sha}`,
    accept: 'application/json',
    name,
    maxBytes: MAX_METADATA_BYTES,
    tooLargeMessage: 'GitLab commit metadata exceeds the 1 MiB safety limit.',
    emptyMessage: 'GitLab returned empty commit metadata.',
    notFoundMessage,
    signal: ctx.signal,
    fetch: dependencies.fetch,
    env: dependencies.env,
  });
  const { review, projectPath, revision } = parseCommitMetadata(
    parseJsonBody(metadataBytes, 'GitLab returned malformed commit metadata.'),
    target,
  );
  const bytes = await fetchCommitDiff({
    project,
    revision,
    name,
    signal: ctx.signal,
    fetch: dependencies.fetch,
    env: dependencies.env,
  });
  const projectName = projectPath.split('/').at(-1) ?? 'project';
  return {
    bytes,
    filename: `${projectName}-commit-${target.sha}.diff`,
    patchArgs: invocation.patchArgs,
    ...(review === undefined ? {} : { review }),
  };
};

export default prepareCommit;
