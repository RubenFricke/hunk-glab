import buildInvocationError from './buildInvocationError.ts';
import parseGitLabProject, {
  type GitLabProject,
} from './parseGitLabProject.ts';
import parseMergeRequestLocator from './parseMergeRequestLocator.ts';
import splitSubcommandArgs from './splitSubcommandArgs.ts';

/** What `hunk glab mr` was asked to open. */
interface MergeRequestInvocation {
  /** Absent when the merge request is found from HEAD. */
  readonly iid?: number;
  /** Absent when the project comes from the local origin. */
  readonly project?: GitLabProject;
  /** Everything after the first `--`, for `hunk patch`. */
  readonly patchArgs: readonly string[];
}

/**
 * Reads the arguments of `hunk glab mr`. Only the tokens before the first `--`
 * belong to the extension; the rest goes to `hunk patch` untouched.
 *
 * @param args - The tokens after `hunk glab mr`.
 * @returns The invocation.
 * @throws {HunkExtensionUserError} When the tokens name more than one merge
 *   request, or a malformed one.
 */
const parseMergeRequestInvocation = (
  args: readonly string[],
): MergeRequestInvocation => {
  const { target, repo, patchArgs } = splitSubcommandArgs(args, {
    command: 'mr',
    subject: 'merge request',
    optionLabel: 'Merge-request option',
  });
  const locator =
    target === undefined ? undefined : parseMergeRequestLocator(target);
  if (repo !== undefined && locator?.project !== undefined) {
    throw buildInvocationError(
      'Do not combine --repo with a locator that already names a project.',
    );
  }
  const project =
    locator?.project ??
    (repo === undefined ? undefined : parseGitLabProject(repo));
  return {
    ...(locator === undefined ? {} : { iid: locator.iid }),
    ...(project === undefined ? {} : { project }),
    patchArgs,
  };
};

export default parseMergeRequestInvocation;
