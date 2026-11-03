import assertSafeArgument from './assertSafeArgument.ts';
import buildInvocationError from './buildInvocationError.ts';

/** One group, subgroup or project name in a GitLab path. */
const PATH_SEGMENT = /^[A-Za-z0-9_.-]+$/;
/** A path always has a slash, so a bare number can only be an id. */
const PROJECT_ID = /^[1-9]\d*$/;

/** A project named by its full path, such as `group/sub/project`. */
interface GitLabProjectPath {
  readonly kind: 'path';
  readonly path: string;
}

/** A project named by the numeric id the GitLab API also accepts. */
interface GitLabProjectId {
  readonly kind: 'id';
  readonly id: number;
}

export type GitLabProject = GitLabProjectPath | GitLabProjectId;

/**
 * Reads a GitLab project: a path, or a numeric id. Unlike a GitHub
 * `owner/repo`, a GitLab path holds two or more names, because groups nest.
 *
 * @param value - The project as the user typed it.
 * @returns The project.
 * @throws {HunkExtensionUserError} When the value is neither a valid path nor a
 *   positive safe integer.
 */
const parseGitLabProject = (value: string): GitLabProject => {
  assertSafeArgument(value, 'GitLab project');
  if (PROJECT_ID.test(value)) {
    const id = Number(value);
    if (!Number.isSafeInteger(id)) {
      throw buildInvocationError(`Invalid GitLab project: ${value}`);
    }
    return { kind: 'id', id };
  }

  const segments = value.split('/');
  const isValid =
    segments.length >= 2 &&
    segments.every(
      (segment) =>
        PATH_SEGMENT.test(segment) && segment !== '.' && segment !== '..',
    );
  if (!isValid) {
    throw buildInvocationError(`Invalid GitLab project: ${value}`);
  }
  return { kind: 'path', path: value };
};

export default parseGitLabProject;
