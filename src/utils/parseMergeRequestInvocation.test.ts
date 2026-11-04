import { describe, expect, it } from 'vitest';

import parseMergeRequestInvocation from './parseMergeRequestInvocation.ts';

const GITLAB_CLI = { kind: 'path', path: 'gitlab-org/cli' } as const;

describe('parseMergeRequestInvocation', () => {
  it.each([[[]], [['--', '--mode', 'unified']]])(
    'reads no merge request from %j, so it is found from HEAD',
    (args) => {
      expect(parseMergeRequestInvocation(args)).toMatchObject({
        patchArgs: args.slice(1),
      });
      expect(parseMergeRequestInvocation(args)).not.toHaveProperty('iid');
    },
  );

  it('keeps --repo without a number, to search that project', () => {
    expect(parseMergeRequestInvocation(['--repo', 'gitlab-org/cli'])).toEqual({
      project: GITLAB_CLI,
      patchArgs: [],
    });
  });

  it('reads a number without a project', () => {
    expect(parseMergeRequestInvocation(['123'])).toEqual({
      iid: 123,
      patchArgs: [],
    });
  });

  it.each([
    [['!123', '--repo', 'gitlab-org/cli']],
    [['--repo', 'gitlab-org/cli', '123']],
    [['123', '--repo=gitlab-org/cli']],
  ])('reads the project from %j', (args) => {
    expect(parseMergeRequestInvocation(args)).toEqual({
      iid: 123,
      project: GITLAB_CLI,
      patchArgs: [],
    });
  });

  it.each([
    [['gitlab-org/cli!123']],
    [['https://gitlab.com/gitlab-org/cli/-/merge_requests/123']],
  ])('reads the project from the locator %j', (args) => {
    expect(parseMergeRequestInvocation(args)).toEqual({
      iid: 123,
      project: GITLAB_CLI,
      patchArgs: [],
    });
  });

  it.each([
    [['gitlab-org/cli!1', '--repo', 'a/b']],
    [['--repo=a/b', 'https://gitlab.com/gitlab-org/cli/-/merge_requests/1']],
  ])('rejects --repo next to a locator that names a project: %j', (args) => {
    expect(() => parseMergeRequestInvocation(args)).toThrow(
      expect.objectContaining({
        message:
          'Do not combine --repo with a locator that already names a project.',
      }),
    );
  });

  it('passes every token after the first -- to hunk patch untouched', () => {
    expect(
      parseMergeRequestInvocation([
        '1',
        '--',
        '--mode',
        'unified',
        '--repo',
        '--',
        'x',
      ]),
    ).toEqual({
      iid: 1,
      patchArgs: ['--mode', 'unified', '--repo', '--', 'x'],
    });
  });

  it.each([
    [['1', '2'], 'Specify exactly one merge request.'],
    [['1', '--repo', 'a/b', '--repo', 'a/b'], 'Specify --repo only once.'],
    [['1', '--repo=a/b', '--repo=a/b'], 'Specify --repo only once.'],
    [['1', '--repo'], '`--repo` requires a group/project value.'],
    [['1', '--repo', '--', 'x'], '`--repo` requires a group/project value.'],
    [['1', '--repo='], '`--repo` requires a group/project value.'],
    [['1', '--draft'], 'Unknown mr option: --draft'],
    [['1', '-R', 'a/b'], 'Unknown mr option: -R'],
    [['1', '--repo', 'project'], 'Invalid GitLab project: project'],
  ])('rejects %j', (args, message) => {
    expect(() => parseMergeRequestInvocation(args)).toThrow(
      expect.objectContaining({ message }),
    );
  });

  it('rejects an option with control characters without echoing it', () => {
    expect(() => parseMergeRequestInvocation(['1', '--\u001b[2Jx'])).toThrow(
      expect.objectContaining({
        message: 'Merge-request option cannot contain control characters.',
      }),
    );
  });
});
