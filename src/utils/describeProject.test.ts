import { describe, expect, it } from 'vitest';

import describeProject from './describeProject.ts';

describe('describeProject', () => {
  it('names a project by its path or its id', () => {
    expect(describeProject({ kind: 'path', path: 'gitlab-org/cli' })).toBe(
      'gitlab-org/cli',
    );
    expect(describeProject({ kind: 'id', id: 34675721 })).toBe('34675721');
  });
});
