import { describe, expect, it } from 'vitest';

import parseGitLabPageUrl from './parseGitLabPageUrl.ts';

describe('parseGitLabPageUrl', () => {
  it.each([
    [
      'https://gitlab.com/group/sub/cli/-/merge_requests/4306',
      'merge_requests',
      { path: 'group/sub/cli', ref: '4306' },
    ],
    [
      'https://gitlab.com/gitlab-org/cli/-/commit/d7e533ee',
      'commit',
      { path: 'gitlab-org/cli', ref: 'd7e533ee' },
    ],
  ] as const)('reads the project and the ref of %s', (url, section, page) => {
    expect(parseGitLabPageUrl(url, section)).toEqual(page);
  });

  it.each([
    'http://gitlab.com/a/b/-/commit/1',
    'https://gitlab.example.com/a/b/-/commit/1',
    'https://gitlab.com:8443/a/b/-/commit/1',
    'https://me@gitlab.com/a/b/-/commit/1',
    'https://gitlab.com/a/b/-/commit/1?x=1',
    'https://gitlab.com/a/b/-/commit/1#n',
    'https://gitlab.com/a/b/-/merge_requests/1',
    'https://gitlab.com/a/b/-/commit/1/diffs',
    'https://gitlab.com/b/-/commit/1',
    'https://gitlab.com/123/-/commit/1',
    'https://gitlab.com/gr%20oup/b/-/commit/1',
    'not a url',
  ])('finds no commit page in %s', (url) => {
    expect(parseGitLabPageUrl(url, 'commit')).toBeNull();
  });
});
