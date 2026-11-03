import { describe, expect, it } from 'vitest';

import prepareMergeRequest from './prepareMergeRequest.ts';
import recordCliContext from '../test/recordCliContext.ts';
import recordFetch from '../test/recordFetch.ts';
import respondWithMergeRequest from '../test/respondWithMergeRequest.ts';

const MERGE_REQUEST =
  'https://gitlab.com/api/v4/projects/vbti-products%2Fadam-one%2Fadam-one-app/merge_requests/12';

describe('prepareMergeRequest', () => {
  it('fetches the metadata and the raw diff of the merge request', async () => {
    const { stderr, ctx } = recordCliContext();
    const { requests, fetch } = recordFetch(
      respondWithMergeRequest({
        path: 'vbti-products/adam-one/adam-one-app',
        iid: 12,
        diff: 'diff --git a/a b/a\n',
      }),
    );

    const prepared = await prepareMergeRequest({
      args: [
        '!12',
        '--repo',
        'vbti-products/adam-one/adam-one-app',
        '--',
        '-x',
        '4',
      ],
      ctx,
      dependencies: { fetch },
    });

    expect(requests.map(({ url }) => url)).toEqual([
      MERGE_REQUEST,
      `${MERGE_REQUEST}/raw_diffs`,
    ]);
    expect(stderr).toEqual([
      'Fetching GitLab merge request vbti-products/adam-one/adam-one-app!12…\n',
    ]);
    expect(new TextDecoder().decode(prepared.bytes)).toBe(
      'diff --git a/a b/a\n',
    );
    expect(prepared).toMatchObject({
      filename: 'adam-one-app-mr-12.diff',
      patchArgs: ['-x', '4'],
      review: {
        kind: 'change-request',
        provider: 'GitLab',
        id: '!12',
        repository: 'vbti-products/adam-one/adam-one-app',
        state: 'open',
        draft: true,
      },
    });
  });

  it('names the 64 MiB limit and an empty diff', async () => {
    const metadata = respondWithMergeRequest({ path: 'a/b', iid: 1, diff: '' });
    const empty = recordFetch(metadata);
    const big = recordFetch((url) =>
      url.endsWith('/raw_diffs')
        ? new Response('x', {
            headers: { 'content-length': String(64 * 1024 * 1024 + 1) },
          })
        : metadata(url),
    );
    const args = ['1', '--repo', 'a/b'];

    await expect(
      prepareMergeRequest({
        args,
        ctx: recordCliContext().ctx,
        dependencies: { fetch: empty.fetch },
      }),
    ).rejects.toMatchObject({ message: 'GitLab returned an empty diff.' });
    await expect(
      prepareMergeRequest({
        args,
        ctx: recordCliContext().ctx,
        dependencies: { fetch: big.fetch },
      }),
    ).rejects.toMatchObject({
      message: 'The GitLab diff exceeds the 64 MiB safety limit.',
    });
  });

  it.each([[['1']], [['x', '--repo', 'a/b']]])(
    'rejects %j before any request',
    async (args) => {
      const { requests, fetch } = recordFetch(() => new Response('diff'));

      await expect(
        prepareMergeRequest({
          args,
          ctx: recordCliContext().ctx,
          dependencies: { fetch },
        }),
      ).rejects.toMatchObject({ name: 'HunkExtensionUserError' });
      expect(requests).toEqual([]);
    },
  );
});
