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
    case 401:
      return new HunkExtensionUserError(
        `GitLab rejected the configured token for ${name}.`,
        {
          suggestions: [
            'Refresh GITLAB_TOKEN or GITLAB_ACCESS_TOKEN and retry.',
          ],
        },
      );
    case 403:
      return new HunkExtensionUserError(`GitLab denied access to ${name}.`, {
        suggestions: [
          'Check that the token can read the project and has the read_api scope.',
        ],
      });
    case 404:
      return new HunkExtensionUserError(
        `GitLab could not find an accessible merge request at ${name}.`,
        {
          suggestions: [
            'Check the project and the merge-request number.',
            'Private projects need GITLAB_TOKEN with the read_api scope.',
          ],
        },
      );
    case 429:
      return new HunkExtensionUserError(
        `GitLab API rate limiting blocked ${name}.`,
        {
          suggestions: [
            'Set GITLAB_TOKEN, or retry after the rate limit resets.',
          ],
        },
      );
    default:
      return new HunkExtensionUserError(
        `GitLab returned HTTP ${String(status)} for ${name}.`,
      );
  }
};

export default buildStatusError;
