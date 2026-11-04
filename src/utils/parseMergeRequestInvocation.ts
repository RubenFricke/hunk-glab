import assertSafeArgument from './assertSafeArgument.ts';
import buildInvocationError from './buildInvocationError.ts';
import parseGitLabProject, {
  type GitLabProject,
} from './parseGitLabProject.ts';
import parseMergeRequestLocator from './parseMergeRequestLocator.ts';

const REPO_OPTION = '--repo';
const REPO_PREFIX = '--repo=';

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
  const separator = args.indexOf('--');
  const ownedArgs = separator < 0 ? args : args.slice(0, separator);
  const patchArgs = separator < 0 ? [] : args.slice(separator + 1);

  let target: string | undefined;
  let repo: string | undefined;
  const takeRepo = (value: string | undefined): void => {
    if (repo !== undefined) {
      throw buildInvocationError('Specify --repo only once.');
    }
    if (!value || value.startsWith('--')) {
      throw buildInvocationError('`--repo` requires a group/project value.');
    }
    repo = value;
  };
  for (let index = 0; index < ownedArgs.length; index += 1) {
    const token = ownedArgs[index] ?? '';
    if (token === REPO_OPTION) {
      takeRepo(ownedArgs[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith(REPO_PREFIX)) {
      takeRepo(token.slice(REPO_PREFIX.length));
      continue;
    }
    if (token.startsWith('-')) {
      assertSafeArgument(token, 'Merge-request option');
      throw buildInvocationError(`Unknown mr option: ${token}`);
    }
    if (target !== undefined) {
      throw buildInvocationError('Specify exactly one merge request.');
    }
    target = token;
  }

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
    patchArgs: Object.freeze([...patchArgs]),
  };
};

export default parseMergeRequestInvocation;
