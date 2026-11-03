import { describe, expect, it } from 'vitest';

import parseGitLabProject from './parseGitLabProject.ts';

describe('parseGitLabProject', () => {
  it.each([
    'gitlab-org/cli',
    'vbti-products/part-inspection/adam-one/adam-one-app',
    'Group_1/sub.group/my-project',
  ])('reads the path %s', (value) => {
    expect(parseGitLabProject(value)).toEqual({ kind: 'path', path: value });
  });

  it.each([
    'project',
    'group/',
    '/project',
    'group//project',
    'group/./project',
    'group/../project',
    'group/pro ject',
    'group/project?x=1',
    'group/project#1',
    'group\\project',
    '',
  ])('rejects %j', (value) => {
    expect(() => parseGitLabProject(value)).toThrow(
      expect.objectContaining({ message: `Invalid GitLab project: ${value}` }),
    );
  });

  it('rejects control characters without echoing them', () => {
    expect(() => parseGitLabProject('group/\u001b[2Jproject')).toThrow(
      expect.objectContaining({
        message: 'GitLab project cannot contain control characters.',
      }),
    );
  });
});
