import buildInvocationError from './buildInvocationError.ts';
import parseCommitLocator from './parseCommitLocator.ts';
import parseGitLabProject, {
  type GitLabProject,
} from './parseGitLabProject.ts';
import splitSubcommandArgs from './splitSubcommandArgs.ts';

/** What `hunk glab commit` was asked to open. */
interface CommitInvocation {
  /** The SHA in lowercase. */
  readonly sha: string;
  /** Absent when the project comes from the local origin. */
  readonly project?: GitLabProject;
  /** Everything after the first `--`, for `hunk patch`. */
  readonly patchArgs: readonly string[];
}

/**
 * Reads the arguments of `hunk glab commit`.
 *
 * @param args - The tokens after `hunk glab commit`.
 * @returns The invocation.
 * @throws {HunkExtensionUserError} When the tokens do not name exactly one
 *   commit, or name its project twice.
 */
const parseCommitInvocation = (args: readonly string[]): CommitInvocation => {
  const { target, repo, patchArgs } = splitSubcommandArgs(args, {
    command: 'commit',
    subject: 'commit',
    optionLabel: 'Commit option',
  });
  if (target === undefined) {
    throw buildInvocationError('Specify one GitLab commit.');
  }
  const locator = parseCommitLocator(target);
  if (repo !== undefined && locator.project !== undefined) {
    throw buildInvocationError(
      'Do not combine --repo with a locator that already names a project.',
    );
  }
  const project =
    locator.project ??
    (repo === undefined ? undefined : parseGitLabProject(repo));
  return {
    sha: locator.sha,
    ...(project === undefined ? {} : { project }),
    patchArgs,
  };
};

export default parseCommitInvocation;
