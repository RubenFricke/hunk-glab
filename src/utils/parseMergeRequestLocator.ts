import assertSafeArgument from './assertSafeArgument.ts';
import buildInvocationError from './buildInvocationError.ts';
import parseGitLabProject, {
  type GitLabProject,
} from './parseGitLabProject.ts';
import parseMergeRequestIid from './parseMergeRequestIid.ts';

const NUMBER = /^!?\d+$/;
/** GitLab's full reference: `group/project!123`, or `34675721!123`. */
const SHORTHAND = /^([^!]+)!([^!]*)$/;
/**
 * Checked on the raw text, because `URL` drops a default port such as `:443`
 * and would let it through.
 */
const GITLAB_ORIGIN = /^https:\/\/gitlab\.com\//i;
const MERGE_REQUEST_PATH = /^\/(.+)\/-\/merge_requests\/([^/]+)$/;

/** One merge request as the user named it. */
interface MergeRequestLocator {
  /** Absent when only a number was given. */
  readonly project?: GitLabProject;
  readonly iid: number;
}

/**
 * Reads a number, GitLab's `group/project!123` shorthand, or an unmodified
 * gitlab.com merge-request URL.
 *
 * @param value - The locator as the user typed it.
 * @returns The merge request.
 * @throws {HunkExtensionUserError} When the value is none of these forms.
 */
const parseMergeRequestLocator = (value: string): MergeRequestLocator => {
  assertSafeArgument(value, 'Merge-request locator');
  if (NUMBER.test(value)) {
    return { iid: parseMergeRequestIid(value) };
  }

  const shorthand = SHORTHAND.exec(value);
  if (shorthand?.[1] !== undefined && shorthand[2] !== undefined) {
    return {
      project: parseGitLabProject(shorthand[1]),
      iid: parseMergeRequestIid(shorthand[2]),
    };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw buildInvocationError(
      `Invalid GitLab merge-request locator: ${value}`,
    );
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
      'Merge-request URLs must be unmodified https://gitlab.com URLs.',
    );
  }
  const path = MERGE_REQUEST_PATH.exec(url.pathname);
  if (path?.[1] === undefined || path[2] === undefined) {
    throw buildInvocationError(
      'GitLab merge-request URLs must end with /group/project/-/merge_requests/number.',
    );
  }
  const project = parseGitLabProject(path[1]);
  if (project.kind !== 'path') {
    throw buildInvocationError(`Invalid GitLab project: ${path[1]}`);
  }
  return { project, iid: parseMergeRequestIid(path[2]) };
};

export default parseMergeRequestLocator;
