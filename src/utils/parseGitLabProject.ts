import assertSafeArgument from './assertSafeArgument.ts';
import buildInvocationError from './buildInvocationError.ts';

/** One group, subgroup or project name in a GitLab path. */
const PATH_SEGMENT = /^[A-Za-z0-9_.-]+$/;

/** A project named by its full path, such as `group/sub/project`. */
interface GitLabProjectPath {
  readonly kind: 'path';
  readonly path: string;
}

export type GitLabProject = GitLabProjectPath;

/**
 * Reads a GitLab project path. Unlike a GitHub `owner/repo`, a GitLab path
 * holds two or more names, because groups nest.
 *
 * @param value - The project as the user typed it.
 * @returns The project.
 * @throws {HunkExtensionUserError} When the value is not a valid path.
 */
const parseGitLabProject = (value: string): GitLabProject => {
  assertSafeArgument(value, 'GitLab project');
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
