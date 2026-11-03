import type { GitLabProject } from './parseGitLabProject.ts';

/** One merge request: a project and the number within it. */
export interface MergeRequestTarget {
  readonly project: GitLabProject;
  readonly iid: number;
}

/**
 * Names a merge request for messages, the way GitLab references it.
 *
 * @param target - The merge request.
 * @returns `group/project!123`.
 */
const describeMergeRequest = ({ project, iid }: MergeRequestTarget): string =>
  `${project.path}!${String(iid)}`;

export default describeMergeRequest;
