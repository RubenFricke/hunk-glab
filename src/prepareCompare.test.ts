import { describe, expect, it } from 'vitest';

import prepareCompare from './prepareCompare.ts';
import recordCliContext from '../test/recordCliContext.ts';
import recordFetch from '../test/recordFetch.ts';

const refuse = (): Promise<never> =>
  Promise.reject(new Error('The command must not read Git.'));

const FILE = {
  old_path: 'a.txt',
  new_path: 'a.txt',
  a_mode: '100644',
  b_mode: '100644',
  new_file: false,
  renamed_file: false,
  deleted_file: false,
  collapsed: false,
  too_large: false,
  diff: '@@ -1 +1 @@\n-a\n+b\n',
};

const comparison =
  (diffs: unknown[], isTimedOut = false) =>
  () =>
    Response.json({
      commits: [],
      diffs,
      compare_timeout: isTimedOut,
      compare_same_ref: false,
      web_url: 'https://gitlab.com/gitlab-org/cli/-/compare/a...b',
    });

const prepare = (args: string[], respond: () => Response) => {
  const recorded = recordFetch(respond);
  const context = recordCliContext();
  return {
    ...recorded,
    stderr: context.stderr,
    result: prepareCompare({
      args,
      ctx: context.ctx,
      dependencies: {
        fetch: recorded.fetch,
        env: {},
        readOrigin: () => Promise.resolve('git@gitlab.com:gitlab-org/cli.git'),
        readCheckout: refuse,
      },
    }),
  };
};

describe('prepareCompare', () => {
  it('compares from the merge base and builds the patch', async () => {
    const { requests, stderr, result } = prepare(
      ['main...feature/x', '--', '--mode', 'unified'],
      comparison([FILE]),
    );

    const prepared = await result;

    expect(requests.map(({ url }) => url)).toEqual([
      'https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/repository/compare?from=main&to=feature%2Fx&straight=false',
    ]);
    expect(stderr).toEqual([
      'Fetching GitLab comparison gitlab-org/cli:main...feature/x…\n',
    ]);
    expect(new TextDecoder().decode(prepared.bytes)).toContain(
      'diff --git a/a.txt b/a.txt\n',
    );
    expect(prepared).toMatchObject({
      filename: 'cli-compare.diff',
      patchArgs: ['--mode', 'unified'],
      review: { kind: 'comparison', base: 'main', head: 'feature/x' },
    });
  });

  it('says when the refs have no changes between them', async () => {
    await expect(
      prepare(['main...main'], comparison([])).result,
    ).rejects.toMatchObject({
      message: 'GitLab found no changes between main and main.',
    });
  });

  it('refuses 1,000 files or more', async () => {
    await expect(
      prepare(['a...b'], comparison(Array.from({ length: 1000 }, () => FILE)))
        .result,
    ).rejects.toMatchObject({
      message:
        'The GitLab diff of gitlab-org/cli:a...b has 1,000 or more files, so it may be incomplete.',
      suggestions: [
        'Run `hunk diff a...b` in a checkout that has both refs, for the full diff.',
      ],
    });
  });

  it.each([
    ['a collapsed file', comparison([{ ...FILE, collapsed: true, diff: '' }])],
    ['a timeout', comparison([FILE], true)],
  ])('points %s at a local review', async (_name, respond) => {
    await expect(
      prepare(['v1.126.0...v1.127.0'], respond).result,
    ).rejects.toMatchObject({
      suggestions: [
        'Run `hunk diff v1.126.0...v1.127.0` in a checkout that has both refs, for the full diff.',
      ],
    });
  });

  it('says when GitLab does not know a ref', async () => {
    await expect(
      prepare(['main...nope'], () => new Response('', { status: 404 })).result,
    ).rejects.toMatchObject({
      message:
        'GitLab could not find an accessible comparison at gitlab-org/cli:main...nope.',
    });
  });
});
