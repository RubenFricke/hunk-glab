import { describe, expect, it } from 'vitest';

import findOpenMergeRequest from './findOpenMergeRequest.ts';
import recordFetch from '../test/recordFetch.ts';

const SHA = 'd7e533ee212a48942cfd8544188bb15f46630f32';
const CHECKOUT = { branch: 'feature/x', sha: SHA };
const PROJECT = { kind: 'path', path: 'gitlab-org/cli' } as const;
const MATCH = {
  iid: 4307,
  state: 'opened',
  references: { full: 'gitlab-org/cli!4307' },
};

const UPSTREAM = 'a'.repeat(40);

const find = (
  respond: (url: string) => Response,
  checkout: { branch: string; sha: string; upstreamSha?: string } = CHECKOUT,
) => {
  const recorded = recordFetch(respond);
  return {
    requests: recorded.requests,
    result: findOpenMergeRequest({
      project: PROJECT,
      checkout,
      signal: new AbortController().signal,
      fetch: recorded.fetch,
      env: {},
    }),
  };
};

describe('findOpenMergeRequest', () => {
  it('asks GitLab for the open merge requests of the exact commit', async () => {
    const { requests, result } = find(() => Response.json([MATCH]));

    expect(await result).toEqual({ project: PROJECT, iid: 4307 });
    expect(requests.map(({ url }) => url)).toEqual([
      `https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/repository/commits/${SHA}/merge_requests?state=opened&per_page=100`,
    ]);
  });

  it('says when no open merge request matches', async () => {
    const { result } = find(() => Response.json([]));

    await expect(result).rejects.toMatchObject({
      message: `No accessible open merge request matches gitlab-org/cli:feature/x@${SHA.slice(0, 12)}.`,
      suggestions: [
        'Pass a merge-request number, group/project!123, or URL explicitly.',
      ],
    });
  });

  it('says when GitLab does not know the commit', async () => {
    const { result } = find(() => new Response('', { status: 404 }));

    await expect(result).rejects.toMatchObject({
      message: `GitLab could not find an accessible commit at gitlab-org/cli@${SHA}.`,
    });
  });

  it.each([
    ['not JSON', () => new Response('<html>')],
    ['not a list', () => Response.json({})],
  ])('rejects matches that are %s', async (_name, respond) => {
    const { result } = find(respond);

    await expect(result).rejects.toMatchObject({
      message: 'GitLab returned malformed merge-request matches.',
    });
  });

  it.each([
    ['no match', () => Response.json([])],
    ['an unknown commit', () => new Response('', { status: 404 })],
  ])(
    'tries the pushed upstream when HEAD gives %s',
    async (_name, respondToHead) => {
      const { requests, result } = find(
        (url) => (url.includes(SHA) ? respondToHead() : Response.json([MATCH])),
        { ...CHECKOUT, upstreamSha: UPSTREAM },
      );

      expect(await result).toEqual({ project: PROJECT, iid: 4307 });
      expect(requests.map(({ url }) => url.includes(UPSTREAM))).toEqual([
        false,
        true,
      ]);
    },
  );

  it('names the upstream when it has no match either', async () => {
    const { result } = find(() => Response.json([]), {
      ...CHECKOUT,
      upstreamSha: UPSTREAM,
    });

    await expect(result).rejects.toMatchObject({
      message: `No accessible open merge request matches gitlab-org/cli:feature/x@${UPSTREAM.slice(0, 12)}.`,
    });
  });

  it('asks once when the upstream is HEAD', async () => {
    const { requests, result } = find(() => Response.json([]), {
      ...CHECKOUT,
      upstreamSha: SHA,
    });

    await expect(result).rejects.toMatchObject({
      name: 'HunkExtensionUserError',
    });
    expect(requests).toHaveLength(1);
  });

  it('does not hide another failure behind the upstream', async () => {
    const { requests, result } = find(() => new Response('', { status: 401 }), {
      ...CHECKOUT,
      upstreamSha: UPSTREAM,
    });

    await expect(result).rejects.toMatchObject({
      message: `GitLab rejected the configured token for gitlab-org/cli:feature/x@${SHA.slice(0, 12)}.`,
    });
    expect(requests).toHaveLength(1);
  });
});
