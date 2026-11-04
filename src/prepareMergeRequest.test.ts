import { describe, expect, it } from 'vitest';

import prepareMergeRequest from './prepareMergeRequest.ts';
import recordCliContext from '../test/recordCliContext.ts';
import recordFetch from '../test/recordFetch.ts';
import respondWithMergeRequest from '../test/respondWithMergeRequest.ts';

/** Fails the test when a command reads origin it should not need. */
const refuseOrigin = (): Promise<string> =>
  Promise.reject(new Error('The command must not read origin.'));

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
      dependencies: { fetch, env: {}, readOrigin: refuseOrigin },
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
        dependencies: { fetch: empty.fetch, env: {}, readOrigin: refuseOrigin },
      }),
    ).rejects.toMatchObject({ message: 'GitLab returned an empty diff.' });
    await expect(
      prepareMergeRequest({
        args,
        ctx: recordCliContext().ctx,
        dependencies: { fetch: big.fetch, env: {}, readOrigin: refuseOrigin },
      }),
    ).rejects.toMatchObject({
      message: 'The GitLab diff exceeds the 64 MiB safety limit.',
    });
  });

  it('reads the project from origin without --repo', async () => {
    const { requests, fetch } = recordFetch(
      respondWithMergeRequest({ path: 'group/project', iid: 7, diff: 'd' }),
    );

    const prepared = await prepareMergeRequest({
      args: ['7'],
      ctx: recordCliContext().ctx,
      dependencies: {
        fetch,
        env: {},
        readOrigin: () => Promise.resolve('git@gitlab.com:group/project.git'),
      },
    });

    expect(requests[0]?.url).toBe(
      'https://gitlab.com/api/v4/projects/group%2Fproject/merge_requests/7',
    );
    expect(prepared.review.repository).toBe('group/project');
    expect(prepared.filename).toBe('project-mr-7.diff');
  });

  it('rejects an origin outside gitlab.com before any request', async () => {
    const { requests, fetch } = recordFetch(() => new Response('diff'));

    await expect(
      prepareMergeRequest({
        args: ['7'],
        ctx: recordCliContext().ctx,
        dependencies: {
          fetch,
          env: {},
          readOrigin: () => Promise.resolve('git@github.com:a/b.git'),
        },
      }),
    ).rejects.toMatchObject({
      message: 'The local origin is not a supported gitlab.com project.',
    });
    expect(requests).toEqual([]);
  });

  it.each([[['x', '--repo', 'a/b']], [['1', '2']]])(
    'rejects %j before any request',
    async (args) => {
      const { requests, fetch } = recordFetch(() => new Response('diff'));

      await expect(
        prepareMergeRequest({
          args,
          ctx: recordCliContext().ctx,
          dependencies: { fetch, env: {}, readOrigin: refuseOrigin },
        }),
      ).rejects.toMatchObject({ name: 'HunkExtensionUserError' });
      expect(requests).toEqual([]);
    },
  );

  it('opens a merge request of a project given by id', async () => {
    const { stderr, ctx } = recordCliContext();
    const { requests, fetch } = recordFetch(
      respondWithMergeRequest({ path: 'gitlab-org/cli', iid: 4306, diff: 'd' }),
    );

    const prepared = await prepareMergeRequest({
      args: ['4306', '--repo=34675721'],
      ctx,
      dependencies: { fetch, env: {}, readOrigin: refuseOrigin },
    });

    expect(requests.map(({ url }) => url)).toEqual([
      'https://gitlab.com/api/v4/projects/34675721/merge_requests/4306',
      'https://gitlab.com/api/v4/projects/34675721/merge_requests/4306/raw_diffs',
    ]);
    expect(stderr).toEqual(['Fetching GitLab merge request 34675721!4306…\n']);
    expect(prepared).toMatchObject({
      filename: 'cli-mr-4306.diff',
      review: { repository: 'gitlab-org/cli' },
    });
  });
});
