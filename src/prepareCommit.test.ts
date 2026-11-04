import { describe, expect, it } from 'vitest';

import prepareCommit from './prepareCommit.ts';
import recordCliContext from '../test/recordCliContext.ts';
import recordFetch from '../test/recordFetch.ts';

const SHA = 'd7e533ee212a48942cfd8544188bb15f46630f32';
const API = 'https://gitlab.com/api/v4/projects';

const refuse = (): Promise<never> =>
  Promise.reject(new Error('The command must not read Git.'));

/** Answers like gitlab.com for commit d7e533e of gitlab-org/cli. */
const respondWithCommit = (url: string): Response =>
  url.includes('/diff?')
    ? Response.json([
        {
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
        },
      ])
    : Response.json({
        id: SHA,
        short_id: 'd7e533ee',
        title: 'feat(list): accept relative dates',
        author_name: 'Hamza Hassanain',
        authored_date: '2026-11-02T22:25:12.000+02:00',
        web_url: `https://gitlab.com/gitlab-org/cli/-/commit/${SHA}`,
      });

describe('prepareCommit', () => {
  it('fetches the metadata and the diff of the commit', async () => {
    const { stderr, ctx } = recordCliContext();
    const { requests, fetch } = recordFetch(respondWithCommit);

    const prepared = await prepareCommit({
      args: ['d7e533e', '--repo', '34675721', '--', '--mode', 'unified'],
      ctx,
      dependencies: {
        fetch,
        env: {},
        readOrigin: refuse,
        readCheckout: refuse,
      },
    });

    expect(requests.map(({ url }) => url)).toEqual([
      `${API}/34675721/repository/commits/d7e533e`,
      `${API}/34675721/repository/commits/${SHA}/diff?per_page=100&page=1`,
    ]);
    expect(stderr).toEqual(['Fetching GitLab commit 34675721@d7e533e…\n']);
    expect(new TextDecoder().decode(prepared.bytes)).toBe(
      'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-a\n+b\n',
    );
    expect(prepared).toMatchObject({
      filename: 'cli-commit-d7e533e.diff',
      patchArgs: ['--mode', 'unified'],
      review: { kind: 'commit', revision: SHA, displayRevision: 'd7e533ee' },
    });
  });

  it('reads the project from origin without --repo', async () => {
    const { requests, fetch } = recordFetch(respondWithCommit);

    await prepareCommit({
      args: ['d7e533e'],
      ctx: recordCliContext().ctx,
      dependencies: {
        fetch,
        env: {},
        readOrigin: () => Promise.resolve('git@gitlab.com:gitlab-org/cli.git'),
        readCheckout: refuse,
      },
    });

    expect(requests[0]?.url).toBe(
      `${API}/gitlab-org%2Fcli/repository/commits/d7e533e`,
    );
  });

  it('says when GitLab does not know the commit', async () => {
    const { fetch } = recordFetch(() => new Response('', { status: 404 }));

    await expect(
      prepareCommit({
        args: ['d7e533e', '--repo', 'gitlab-org/cli'],
        ctx: recordCliContext().ctx,
        dependencies: {
          fetch,
          env: {},
          readOrigin: refuse,
          readCheckout: refuse,
        },
      }),
    ).rejects.toMatchObject({
      message:
        'GitLab could not find an accessible commit at gitlab-org/cli@d7e533e.',
    });
  });
});
