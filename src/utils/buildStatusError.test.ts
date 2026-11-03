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
});
