import { describe, expect, it } from 'vitest';

import parseMergeRequestMetadata from './parseMergeRequestMetadata.ts';

const TARGET = {
  project: { kind: 'path', path: 'gitlab-org/cli' },
  iid: 4306,
} as const;

const METADATA = {
  title: 'chore(deps): update goldmark to v2',
  web_url: 'https://gitlab.com/gitlab-org/cli/-/merge_requests/4306',
  author: { username: 'gitlab-dependency-update-bot' },
  target_branch: 'main',
  source_branch: 'renovate/goldmark-2.x',
  state: 'opened',
  draft: false,
};

const MALFORMED = 'GitLab returned malformed merge-request metadata.';

describe('parseMergeRequestMetadata', () => {
  it('describes the merge request for the review header', () => {
    expect(parseMergeRequestMetadata(METADATA, TARGET)).toEqual({
      kind: 'change-request',
      provider: 'GitLab',
      title: 'chore(deps): update goldmark to v2',
      url: 'https://gitlab.com/gitlab-org/cli/-/merge_requests/4306',
      id: '!4306',
      repository: 'gitlab-org/cli',
      author: 'gitlab-dependency-update-bot',
      base: 'main',
      head: 'renovate/goldmark-2.x',
      state: 'open',
      draft: false,
    });
  });

  it.each([
    ['opened', 'open'],
    ['merged', 'merged'],
    ['closed', 'closed'],
    ['locked', 'closed'],
  ])('shows the state %s as %s', (state, shown) => {
    expect(
      parseMergeRequestMetadata({ ...METADATA, state }, TARGET),
    ).toMatchObject({ state: shown });
  });

  it('leaves out a draft flag GitLab did not send', () => {
    const { draft: _draft, ...withoutDraft } = METADATA;

    expect(parseMergeRequestMetadata(withoutDraft, TARGET)).not.toHaveProperty(
      'draft',
    );
  });

  it('accepts the URL in another letter case', () => {
    const url = 'https://GitLab.com/GitLab-Org/CLI/-/merge_requests/4306';

    expect(
      parseMergeRequestMetadata({ ...METADATA, web_url: url }, TARGET),
    ).toMatchObject({ url });
  });

  it.each([
    ['not an object', null],
    ['a list', [METADATA]],
    ['no title', { ...METADATA, title: undefined }],
    ['an empty title', { ...METADATA, title: '' }],
    ['a title with a control character', { ...METADATA, title: 'a\u001b[2J' }],
    ['a title over 2 KiB', { ...METADATA, title: 'x'.repeat(2049) }],
    ['no author', { ...METADATA, author: null }],
    ['an author without a name', { ...METADATA, author: {} }],
    ['an unknown state', { ...METADATA, state: 'open' }],
    ['a draft flag that is not a boolean', { ...METADATA, draft: 'no' }],
    [
      'a branch over 512 bytes',
      { ...METADATA, source_branch: 'é'.repeat(257) },
    ],
  ])('rejects %s', (_name, value) => {
    expect(() => parseMergeRequestMetadata(value, TARGET)).toThrow(
      expect.objectContaining({ message: MALFORMED }),
    );
  });

  it.each([
    [
      'another project',
      'https://gitlab.com/gitlab-org/other/-/merge_requests/4306',
    ],
    [
      'another merge request',
      'https://gitlab.com/gitlab-org/cli/-/merge_requests/1',
    ],
    [
      'another host',
      'https://gitlab.example.com/gitlab-org/cli/-/merge_requests/4306',
    ],
    ['plain HTTP', 'http://gitlab.com/gitlab-org/cli/-/merge_requests/4306'],
    ['a port', 'https://gitlab.com:8443/gitlab-org/cli/-/merge_requests/4306'],
    [
      'a user name',
      'https://me@gitlab.com/gitlab-org/cli/-/merge_requests/4306',
    ],
    ['a query', 'https://gitlab.com/gitlab-org/cli/-/merge_requests/4306?x=1'],
    ['a fragment', 'https://gitlab.com/gitlab-org/cli/-/merge_requests/4306#n'],
    ['no URL at all', 'not a url'],
  ])('rejects a web URL with %s', (_name, url) => {
    expect(() =>
      parseMergeRequestMetadata({ ...METADATA, web_url: url }, TARGET),
    ).toThrow(expect.objectContaining({ message: MALFORMED }));
  });

  describe('for a project given by id', () => {
    const BY_ID = { project: { kind: 'id', id: 34675721 }, iid: 4306 } as const;

    it('takes the project path from the page URL', () => {
      expect(
        parseMergeRequestMetadata(
          {
            ...METADATA,
            web_url: 'https://gitlab.com/group/sub/cli/-/merge_requests/4306',
          },
          BY_ID,
        ),
      ).toMatchObject({ repository: 'group/sub/cli', id: '!4306' });
    });

    it.each([
      [
        'another merge request',
        'https://gitlab.com/group/cli/-/merge_requests/1',
      ],
      ['a single-name path', 'https://gitlab.com/cli/-/merge_requests/4306'],
      [
        'an invalid path',
        'https://gitlab.com/gr%20oup/cli/-/merge_requests/4306',
      ],
      ['no merge-request path', 'https://gitlab.com/group/cli/-/issues/4306'],
      ['another host', 'https://evil.test/group/cli/-/merge_requests/4306'],
    ])('rejects a page URL with %s', (_name, url) => {
      expect(() =>
        parseMergeRequestMetadata({ ...METADATA, web_url: url }, BY_ID),
      ).toThrow(expect.objectContaining({ message: MALFORMED }));
    });
  });
});
