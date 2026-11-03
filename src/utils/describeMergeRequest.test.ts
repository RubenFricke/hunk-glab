import { describe, expect, it } from 'vitest';

import describeMergeRequest from './describeMergeRequest.ts';

describe('describeMergeRequest', () => {
  it('names a merge request the way GitLab references it', () => {
    expect(
      describeMergeRequest({
        project: { kind: 'path', path: 'gitlab-org/cli' },
        iid: 4306,
      }),
    ).toBe('gitlab-org/cli!4306');
  });
});
