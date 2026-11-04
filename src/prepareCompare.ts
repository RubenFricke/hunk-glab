import { HunkExtensionUserError } from 'hunkdiff/extension';

import fetchGitLab from './fetchGitLab.ts';
import type {
  PreparedDiff,
  PrepareDiffOptions,
} from './prepareMergeRequest.ts';
import resolveProject from './resolveProject.ts';
import buildPatch from './utils/buildPatch.ts';
import describeProject from './utils/describeProject.ts';
import encodeProject from './utils/encodeProject.ts';
import parseCompareInvocation from './utils/parseCompareInvocation.ts';
import parseComparison from './utils/parseComparison.ts';
import parseJsonBody from './utils/parseJsonBody.ts';

const MAX_DIFF_BYTES = 64 * 1024 * 1024;
/** GitLab limits a diff to this many files by default. */
const MAX_FILES = 1000;
const TOO_LARGE = 'The GitLab diff exceeds the 64 MiB safety limit.';

/**
 * Resolves one `hunk glab compare` invocation and fetches the changes of head
 * since its merge base with base, the way `hunk gh compare` shows them. GitLab
 * gives no patch for a comparison, so it is built from the file diffs.
 *
 * @param options - The arguments, the command context and the dependencies.
 * @returns The patch, the review header and the options for `hunk patch`.
 * @throws {HunkExtensionUserError} When the invocation is invalid, a ref is
 *   unknown, there are no changes, or the diff is incomplete or too large.
 */
const prepareCompare = async ({
  args,
  ctx,
  dependencies,
}: PrepareDiffOptions): Promise<PreparedDiff> => {
  const invocation = parseCompareInvocation(args);
  const { base, head } = invocation;
  const project = await resolveProject({
    project: invocation.project,
    cwd: ctx.cwd,
    signal: ctx.signal,
    readOrigin: dependencies.readOrigin,
  });
  const name = `${describeProject(project)}:${base}...${head}`;
  /** Hunk compares local refs through Git, which leaves nothing out. */
  const fullDiff = `Run \`hunk diff ${base}...${head}\` in a checkout that has both refs, for the full diff.`;
  await ctx.stderr.write(`Fetching GitLab comparison ${name}…\n`);

  const bytes = await fetchGitLab({
    apiPath: `projects/${encodeProject(project)}/repository/compare?from=${encodeURIComponent(base)}&to=${encodeURIComponent(head)}&straight=false`,
    accept: 'application/json',
    name,
    maxBytes: MAX_DIFF_BYTES,
    tooLargeMessage: TOO_LARGE,
    emptyMessage: 'GitLab returned a malformed comparison.',
    notFoundMessage: `GitLab could not find an accessible comparison at ${name}.`,
    signal: ctx.signal,
    fetch: dependencies.fetch,
    env: dependencies.env,
  });
  const { files, review, projectPath } = parseComparison(
    parseJsonBody(bytes, 'GitLab returned a malformed comparison.'),
    { project, base, head },
    fullDiff,
  );
  if (files.length >= MAX_FILES) {
    throw new HunkExtensionUserError(
      `The GitLab diff of ${name} has 1,000 or more files, so it may be incomplete.`,
      { suggestions: [fullDiff] },
    );
  }
  const patch = new TextEncoder().encode(buildPatch(files, fullDiff));
  if (patch.byteLength === 0) {
    throw new HunkExtensionUserError(
      `GitLab found no changes between ${base} and ${head}.`,
    );
  }
  if (patch.byteLength > MAX_DIFF_BYTES) {
    throw new HunkExtensionUserError(TOO_LARGE);
  }

  const projectName = projectPath.split('/').at(-1) ?? 'project';
  return {
    bytes: patch,
    filename: `${projectName}-compare.diff`,
    patchArgs: invocation.patchArgs,
    ...(review === undefined ? {} : { review }),
  };
};

export default prepareCompare;
