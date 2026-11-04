import { describe, expect, it } from 'vitest';

import parseCommitMetadata from './parseCommitMetadata.ts';

const SHA = 'd7e533ee212a48942cfd8544188bb15f46630f32';
const BY_PATH = {
  project: { kind: 'path', path: 'gitlab-org/cli' },
  sha: 'd7e533e',
} as const;
const BY_ID = {
  project: { kind: 'id', id: 34675721 },
  sha: 'd7e533e',
} as const;
const METADATA = {
  id: SHA,
  short_id: 'd7e533ee',
  title: 'feat(list): accept relative dates in date flags',
  author_name: 'Hamza Hassanain',
  authored_date: '2026-10-30T12:00:00.000+00:00',
  web_url: `https://gitlab.com/gitlab-org/cli/-/commit/${SHA}`,
};
const MALFORMED = 'GitLab returned malformed commit metadata.';

describe('parseCommitMetadata', () => {
  it('describes the commit for the review header', () => {
    expect(parseCommitMetadata(METADATA, BY_PATH)).toEqual({
      projectPath: 'gitlab-org/cli',
      revision: SHA,
      review: {
        kind: 'commit',
        provider: 'GitLab',
        title: 'feat(list): accept relative dates in date flags',
        url: `https://gitlab.com/gitlab-org/cli/-/commit/${SHA}`,
        revision: SHA,
        displayRevision: 'd7e533ee',
        author: 'Hamza Hassanain',
        authoredAt: '2026-10-30T12:00:00.000+00:00',
      },
    });
  });

  it('drops the link when the header would not fit Hunk without it', () => {
    /**
     * 1,901 quotes take 3,802 bytes in JSON: 4,097 with the link, 4,005
     * without.
     */
    const title = '"'.repeat(1901);
    const { review } = parseCommitMetadata({ ...METADATA, title }, BY_PATH);

    expect(review).toMatchObject({ title });
    expect(review).not.toHaveProperty('url');
  });

  it('leaves out the header that does not fit Hunk at all', () => {
    expect(
      parseCommitMetadata({ ...METADATA, title: '"'.repeat(2000) }, BY_PATH),
    ).toEqual({ projectPath: 'gitlab-org/cli', revision: SHA });
  });

  it('takes the project path from the page link for a project given by id', () => {
    expect(
      parseCommitMetadata(
        {
          ...METADATA,
          web_url: `https://gitlab.com/group/sub/cli/-/commit/${SHA}`,
        },
        BY_ID,
      ),
    ).toMatchObject({ projectPath: 'group/sub/cli' });
  });

  it.each([
    ['not an object', null],
    [
      'a full SHA that does not start with the asked one',
      { ...METADATA, id: 'a'.repeat(40) },
    ],
    ['a short id that is not hexadecimal', { ...METADATA, short_id: 'xyz' }],
    ['no title', { ...METADATA, title: '' }],
    ['a title with a control character', { ...METADATA, title: 'a\tb' }],
    ['no author', { ...METADATA, author_name: undefined }],
    ['a date that is no date', { ...METADATA, authored_date: 'yesterday' }],
    [
      'a link to another commit',
      {
        ...METADATA,
        web_url: 'https://gitlab.com/gitlab-org/cli/-/commit/abc',
      },
    ],
    [
      'a link to another project',
      { ...METADATA, web_url: `https://gitlab.com/other/cli/-/commit/${SHA}` },
    ],
    [
      'a link to another host',
      {
        ...METADATA,
        web_url: `https://evil.test/gitlab-org/cli/-/commit/${SHA}`,
      },
    ],
  ])('rejects %s', (_name, value) => {
    expect(() => parseCommitMetadata(value, BY_PATH)).toThrow(
      expect.objectContaining({ message: MALFORMED }),
    );
  });
});
