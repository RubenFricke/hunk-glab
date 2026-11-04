import { describe, expect, it } from 'vitest';

import parseCommitLocator from './parseCommitLocator.ts';

const SHA = 'd7e533ee212a48942cfd8544188bb15f46630f32';

describe('parseCommitLocator', () => {
  it('reads a SHA in lowercase', () => {
    expect(parseCommitLocator('D7E533E')).toEqual({ sha: 'd7e533e' });
  });

  it.each([
    ['gitlab-org/cli@d7e533e', { kind: 'path', path: 'gitlab-org/cli' }],
    ['group/sub/cli@d7e533e', { kind: 'path', path: 'group/sub/cli' }],
    ['34675721@d7e533e', { kind: 'id', id: 34675721 }],
  ])('reads the shorthand %s', (value, project) => {
    expect(parseCommitLocator(value)).toEqual({ project, sha: 'd7e533e' });
  });

  it.each([
    `https://gitlab.com/gitlab-org/cli/-/commit/${SHA}`,
    `https://GitLab.com/gitlab-org/cli/-/commit/${SHA.toUpperCase()}`,
  ])('reads the URL %s', (value) => {
    expect(parseCommitLocator(value)).toEqual({
      project: { kind: 'path', path: 'gitlab-org/cli' },
      sha: SHA,
    });
  });

  it.each([
    [
      `http://gitlab.com/a/b/-/commit/${SHA}`,
      'Commit URLs must be unmodified https://gitlab.com URLs.',
    ],
    [
      `https://gitlab.com:443/a/b/-/commit/${SHA}`,
      'Commit URLs must be unmodified https://gitlab.com URLs.',
    ],
    [
      `https://gitlab.com/a/b/-/commit/${SHA}?view=parallel`,
      'Commit URLs must be unmodified https://gitlab.com URLs.',
    ],
    [
      `https://gitlab.com/a/b/-/commit/${SHA}#note_1`,
      'Commit URLs must be unmodified https://gitlab.com URLs.',
    ],
    [
      `https://gitlab.com/a/b/-/commit/${SHA}/pipelines`,
      'GitLab commit URLs must end with /group/project/-/commit/sha.',
    ],
    [
      `https://gitlab.com/a/b/commit/${SHA}`,
      'GitLab commit URLs must end with /group/project/-/commit/sha.',
    ],
    ['https://gitlab.com/a/b/-/commit/main', 'Invalid commit SHA: main'],
    ['gitlab-org/cli@main', 'Invalid commit SHA: main'],
    ['cli@d7e533e', 'Invalid GitLab project: cli'],
    ['a/b@c@d7e533e', 'Invalid GitLab commit locator: a/b@c@d7e533e'],
    ['main', 'Invalid GitLab commit locator: main'],
  ])('rejects %s', (value, message) => {
    expect(() => parseCommitLocator(value)).toThrow(
      expect.objectContaining({ message }),
    );
  });

  it('rejects control characters without echoing them', () => {
    expect(() => parseCommitLocator('a/b@d7e533e\u001b')).toThrow(
      expect.objectContaining({
        message: 'Commit locator cannot contain control characters.',
      }),
    );
  });
});
