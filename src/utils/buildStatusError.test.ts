import { describe, expect, it } from 'vitest';

import buildStatusError from './buildStatusError.ts';

const NAME = 'group/project!12';

describe('buildStatusError', () => {
  it('names an unexpected status', () => {
    expect(buildStatusError(500, NAME)).toMatchObject({
      message: `GitLab returned HTTP 500 for ${NAME}.`,
      suggestions: [],
    });
  });

  it('explains HTTP 401', () => {
    expect(buildStatusError(401, NAME)).toMatchObject({
      message: `GitLab rejected the configured token for ${NAME}.`,
      suggestions: ['Refresh GITLAB_TOKEN or GITLAB_ACCESS_TOKEN and retry.'],
    });
  });

  it('explains HTTP 403', () => {
    expect(buildStatusError(403, NAME)).toMatchObject({
      message: `GitLab denied access to ${NAME}.`,
      suggestions: [
        'Check that the token can read the project and has the read_api scope.',
      ],
    });
  });

  it('explains HTTP 404', () => {
    expect(buildStatusError(404, NAME)).toMatchObject({
      message: `GitLab could not find an accessible merge request at ${NAME}.`,
      suggestions: [
        'Check the project and the merge-request number.',
        'Private projects need GITLAB_TOKEN with the read_api scope.',
      ],
    });
  });
});
