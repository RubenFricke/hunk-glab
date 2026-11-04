import { describe, expect, it } from 'vitest';

import fetchCommitDiff from './fetchCommitDiff.ts';
import recordFetch from '../test/recordFetch.ts';

const SHA = 'd7e533ee212a48942cfd8544188bb15f46630f32';
const NAME = `gitlab-org/cli@${SHA}`;
const FULL_DIFF =
  'Run `hunk show d7e533ee212a` in a checkout that has the commit, for the full diff.';

const fileDiff = (index: number): Record<string, unknown> => ({
  old_path: `f${String(index)}.txt`,
  new_path: `f${String(index)}.txt`,
  a_mode: '100644',
  b_mode: '100644',
  new_file: false,
  renamed_file: false,
  deleted_file: false,
  collapsed: false,
  too_large: false,
  diff: '@@ -1 +1 @@\n-a\n+b\n',
});

/** Answers with `total` files, 100 per page, the way GitLab pages them. */
const pagedFiles =
  (total: number) =>
  (url: string): Response => {
    const page = Number(new URL(url).searchParams.get('page'));
    const start = (page - 1) * 100;
    const count = Math.max(0, Math.min(100, total - start));
    return Response.json(
      Array.from({ length: count }, (_, index) => fileDiff(start + index)),
    );
  };

const fetchWith = (respond: (url: string) => Response) => {
  const recorded = recordFetch(respond);
  return {
    requests: recorded.requests,
    result: fetchCommitDiff({
      project: { kind: 'path', path: 'gitlab-org/cli' },
      revision: SHA,
      name: NAME,
      signal: new AbortController().signal,
      fetch: recorded.fetch,
      env: {},
    }),
  };
};

const countFiles = (bytes: Uint8Array): number =>
  new TextDecoder().decode(bytes).split('diff --git ').length - 1;

describe('fetchCommitDiff', () => {
  it('builds the patch from one page', async () => {
    const { requests, result } = fetchWith(pagedFiles(2));

    expect(countFiles(await result)).toBe(2);
    expect(requests.map(({ url }) => url)).toEqual([
      `https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/repository/commits/${SHA}/diff?per_page=100&page=1`,
    ]);
  });

  it('follows the pages until one is not full', async () => {
    const { requests, result } = fetchWith(pagedFiles(250));

    expect(countFiles(await result)).toBe(250);
    expect(requests).toHaveLength(3);
  });

  it('asks for one more page after a full last page', async () => {
    const { requests, result } = fetchWith(pagedFiles(200));

    expect(countFiles(await result)).toBe(200);
    expect(requests).toHaveLength(3);
  });

  it('refuses 1,000 files or more, where GitLab may cut the diff off', async () => {
    const { requests, result } = fetchWith(pagedFiles(1000));

    await expect(result).rejects.toMatchObject({
      message: `The GitLab diff of ${NAME} has 1,000 or more files, so it may be incomplete.`,
      suggestions: [FULL_DIFF],
    });
    expect(requests).toHaveLength(10);
  });

  it('points a file GitLab found too large at a local review', async () => {
    const { result } = fetchWith(() =>
      Response.json([{ ...fileDiff(0), too_large: true, diff: '' }]),
    );

    await expect(result).rejects.toMatchObject({
      message:
        'GitLab left out the diff of b/f0.txt, so the review would be incomplete.',
      suggestions: [FULL_DIFF],
    });
  });

  it('says a commit without files has an empty diff', async () => {
    await expect(fetchWith(pagedFiles(0)).result).rejects.toMatchObject({
      message: 'GitLab returned an empty diff.',
    });
  });

  it('says when GitLab does not know the commit', async () => {
    await expect(
      fetchWith(() => new Response('', { status: 404 })).result,
    ).rejects.toMatchObject({
      message: `GitLab could not find an accessible commit at ${NAME}.`,
    });
  });

  it('keeps all pages together within the byte limit', async () => {
    const recorded = recordFetch(pagedFiles(150));

    await expect(
      fetchCommitDiff({
        project: { kind: 'path', path: 'gitlab-org/cli' },
        revision: SHA,
        name: NAME,
        signal: new AbortController().signal,
        fetch: recorded.fetch,
        env: {},
        maxBytes: 30_000,
      }),
    ).rejects.toMatchObject({
      message: 'The GitLab diff exceeds the 64 MiB safety limit.',
    });
    expect(recorded.requests).toHaveLength(2);
  });

  it.each([
    ['not JSON', () => new Response('<html>')],
    ['not a list', () => Response.json({})],
  ])('rejects a page that is %s', async (_name, respond) => {
    await expect(fetchWith(respond).result).rejects.toMatchObject({
      message: 'GitLab returned malformed diff data.',
    });
  });
});
