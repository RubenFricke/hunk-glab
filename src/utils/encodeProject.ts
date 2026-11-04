import type { GitLabProject } from './parseGitLabProject.ts';

/**
 * Turns a project into the `:id` of a GitLab API path. The API takes an id as
 * it is, and a full path as one URL-encoded segment, slashes included.
 *
 * @param project - The project.
 * @returns The encoded project.
 */
const encodeProject = (project: GitLabProject): string =>
  project.kind === 'id' ? String(project.id) : encodeURIComponent(project.path);

export default encodeProject;
