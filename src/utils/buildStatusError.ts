import { HunkExtensionUserError } from 'hunkdiff/extension';

/**
 * Builds the fixed message for a GitLab response without success. The server
 * body never goes in it.
 *
 * @param status - The HTTP status.
 * @param name - What was requested: `group/project!123`.
 * @returns The user error.
 */
const buildStatusError = (
  status: number,
  name: string,
): HunkExtensionUserError => {
  switch (status) {
    default:
      return new HunkExtensionUserError(
        `GitLab returned HTTP ${String(status)} for ${name}.`,
      );
  }
};

export default buildStatusError;
