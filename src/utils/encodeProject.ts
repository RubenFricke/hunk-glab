import type { GitLabProject } from './parseGitLabProject.ts';

/**
 * Turns a project into the `:id` of a GitLab API path. The API takes a full
 * path as one URL-encoded segment, slashes included.
 *
 * @param project - The project.
 * @returns The encoded project.
 */
const encodeProject = (project: GitLabProject): string =>
  encodeURIComponent(project.path);

export default encodeProject;
