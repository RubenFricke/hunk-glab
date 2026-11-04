import { describe, expect, it } from 'vitest';

import parseMergeRequestLocator from './parseMergeRequestLocator.ts';

const UNMODIFIED =
  'Merge-request URLs must be unmodified https://gitlab.com URLs.';
const URL_SHAPE =
  'GitLab merge-request URLs must end with /group/project/-/merge_requests/number.';

describe('parseMergeRequestLocator', () => {
  it.each(['123', '!123'])('reads the number %s', (value) => {
    expect(parseMergeRequestLocator(value)).toEqual({ iid: 123 });
  });

  it.each([
    ['gitlab-org/cli!4306', { kind: 'path', path: 'gitlab-org/cli' }],
    ['group/sub/project!4306', { kind: 'path', path: 'group/sub/project' }],
    ['34675721!4306', { kind: 'id', id: 34675721 }],
  ])('reads the shorthand %s', (value, project) => {
    expect(parseMergeRequestLocator(value)).toEqual({ project, iid: 4306 });
  });

  it.each([
    [
      'https://gitlab.com/gitlab-org/cli/-/merge_requests/4306',
      'gitlab-org/cli',
    ],
    [
      'https://GitLab.com/Group/Sub/Project/-/merge_requests/7',
      'Group/Sub/Project',
    ],
  ])('reads the URL %s', (value, path) => {
    expect(parseMergeRequestLocator(value)).toMatchObject({
      project: { kind: 'path', path },
    });
  });

  it.each([
    'http://gitlab.com/a/b/-/merge_requests/1',
    'https://gitlab.example.com/a/b/-/merge_requests/1',
    'https://gitlab.com:443/a/b/-/merge_requests/1',
    'https://me@gitlab.com/a/b/-/merge_requests/1',
    'https://gitlab.com/a/b/-/merge_requests/1?tab=diffs',
    'https://gitlab.com/a/b/-/merge_requests/1#note_9',
  ])('rejects the modified URL %s', (value) => {
    expect(() => parseMergeRequestLocator(value)).toThrow(
      expect.objectContaining({ message: UNMODIFIED }),
    );
  });

  it.each([
    'https://gitlab.com/a/b/-/merge_requests/1/diffs',
    'https://gitlab.com/a/b/-/merge_requests/1/',
    'https://gitlab.com/a/b/merge_requests/1',
    'https://gitlab.com/a/b/-/issues/1',
    'https://gitlab.com/-/merge_requests/1',
  ])('rejects the URL path of %s', (value) => {
    expect(() => parseMergeRequestLocator(value)).toThrow(
      expect.objectContaining({ message: URL_SHAPE }),
    );
  });

  it.each([
    ['https://gitlab.com/b/-/merge_requests/1', 'Invalid GitLab project: b'],
    [
      'https://gitlab.com/123/-/merge_requests/1',
      'Invalid GitLab project: 123',
    ],
    [
      'https://gitlab.com/a/b/-/merge_requests/0',
      'Invalid merge-request number: 0',
    ],
    ['project!1', 'Invalid GitLab project: project'],
    ['a/b!x', 'Invalid merge-request number: x'],
    ['a/b!1!2', 'Invalid GitLab merge-request locator: a/b!1!2'],
    ['feature', 'Invalid GitLab merge-request locator: feature'],
  ])('rejects %s', (value, message) => {
    expect(() => parseMergeRequestLocator(value)).toThrow(
      expect.objectContaining({ message }),
    );
  });

  it('rejects control characters without echoing them', () => {
    expect(() => parseMergeRequestLocator('a/b!1\u001b[2J')).toThrow(
      expect.objectContaining({
        message: 'Merge-request locator cannot contain control characters.',
      }),
    );
  });
});
