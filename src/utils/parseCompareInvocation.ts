import buildInvocationError from './buildInvocationError.ts';
import isValidGitRef from './isValidGitRef.ts';
import parseGitLabProject, {
  type GitLabProject,
} from './parseGitLabProject.ts';
import splitSubcommandArgs from './splitSubcommandArgs.ts';

/** What `hunk glab compare` was asked to open. */
interface CompareInvocation {
  readonly base: string;
  readonly head: string;
  /** Absent when the project comes from the local origin. */
  readonly project?: GitLabProject;
  /** Everything after the first `--`, for `hunk patch`. */
  readonly patchArgs: readonly string[];
}

/**
 * Reads the arguments of `hunk glab compare`: one `base...head` range with
 * exactly three dots, as `hunk gh compare` takes it.
 *
 * @param args - The tokens after `hunk glab compare`.
 * @returns The invocation.
 * @throws {HunkExtensionUserError} When the tokens do not name exactly one
 *   valid range.
 */
const parseCompareInvocation = (args: readonly string[]): CompareInvocation => {
  const { target, repo, patchArgs } = splitSubcommandArgs(args, {
    command: 'compare',
    subject: 'comparison',
    optionLabel: 'Compare option',
  });
  if (target === undefined) {
    throw buildInvocationError('Specify one base...head comparison.');
  }
  const [base, head, ...rest] = target.split('...');
  if (!base || !head || rest.length > 0) {
    throw buildInvocationError(
      'Comparisons must use exactly one base...head range.',
    );
  }
  if (!isValidGitRef(base) || !isValidGitRef(head)) {
    throw buildInvocationError(
      'Comparison refs are not valid Git refs or exceed 1024 UTF-8 bytes.',
    );
  }
  return {
    base,
    head,
    ...(repo === undefined ? {} : { project: parseGitLabProject(repo) }),
    patchArgs,
  };
};

export default parseCompareInvocation;
