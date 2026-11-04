import assertSafeArgument from './assertSafeArgument.ts';
import buildInvocationError from './buildInvocationError.ts';
import parseGitLabProject, {
  type GitLabProject,
} from './parseGitLabProject.ts';

/** A SHA of 7 to 40 hexadecimal characters, as `hunk gh commit` takes it. */
const COMMIT_SHA = /^[0-9a-f]{7,40}$/i;
const SHORTHAND = /^([^@]+)@([^@]*)$/;
/** Checked on the raw text, because `URL` drops a default port such as `:443`. */
const GITLAB_ORIGIN = /^https:\/\/gitlab\.com\//i;
const COMMIT_PATH = /^\/(.+)\/-\/commit\/([^/]+)$/;

/** One commit as the user named it. */
interface CommitLocator {
  /** Absent when only a SHA was given. */
  readonly project?: GitLabProject;
  /** The SHA in lowercase. */
  readonly sha: string;
}

/**
 * Reads a SHA, the `group/project@sha` shorthand, or an unmodified gitlab.com
 * commit URL.
 *
 * @param value - The locator as the user typed it.
 * @returns The commit.
 * @throws {HunkExtensionUserError} When the value is none of these forms.
 */
const parseCommitLocator = (value: string): CommitLocator => {
  assertSafeArgument(value, 'Commit locator');
  const readSha = (sha: string): string => {
    if (!COMMIT_SHA.test(sha)) {
      throw buildInvocationError(`Invalid commit SHA: ${sha}`);
    }
    return sha.toLowerCase();
  };
  if (COMMIT_SHA.test(value)) {
    return { sha: value.toLowerCase() };
  }

  const shorthand = SHORTHAND.exec(value);
  if (shorthand?.[1] !== undefined && shorthand[2] !== undefined) {
    return {
      project: parseGitLabProject(shorthand[1]),
      sha: readSha(shorthand[2]),
    };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw buildInvocationError(`Invalid GitLab commit locator: ${value}`);
  }
  if (
    !GITLAB_ORIGIN.test(value) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw buildInvocationError(
      'Commit URLs must be unmodified https://gitlab.com URLs.',
    );
  }
  const path = COMMIT_PATH.exec(url.pathname);
  if (path?.[1] === undefined || path[2] === undefined) {
    throw buildInvocationError(
      'GitLab commit URLs must end with /group/project/-/commit/sha.',
    );
  }
  const project = parseGitLabProject(path[1]);
  if (project.kind !== 'path') {
    throw buildInvocationError(`Invalid GitLab project: ${path[1]}`);
  }
  return { project, sha: readSha(path[2]) };
};

export default parseCommitLocator;
