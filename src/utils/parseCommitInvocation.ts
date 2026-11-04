import assertSafeArgument from './assertSafeArgument.ts';
import buildInvocationError from './buildInvocationError.ts';
import parseGitLabProject, {
  type GitLabProject,
} from './parseGitLabProject.ts';
import splitSubcommandArgs from './splitSubcommandArgs.ts';

/** A SHA of 7 to 40 hexadecimal characters, as `hunk gh commit` takes it. */
const COMMIT_SHA = /^[0-9a-f]{7,40}$/i;

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
 *   commit by its SHA.
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
  assertSafeArgument(target, 'Commit locator');
  if (!COMMIT_SHA.test(target)) {
    throw buildInvocationError(`Invalid GitLab commit locator: ${target}`);
  }
  return {
    sha: target.toLowerCase(),
    ...(repo === undefined ? {} : { project: parseGitLabProject(repo) }),
    patchArgs,
  };
};

export default parseCommitInvocation;
