import type { GitLabProject } from './parseGitLabProject.ts';

/**
 * Names a project for messages, the way the user gave it.
 *
 * @param project - The project.
 * @returns `group/project`, or `34675721` for a project given by id.
 */
const describeProject = (project: GitLabProject): string =>
  project.kind === 'id' ? String(project.id) : project.path;

export default describeProject;
