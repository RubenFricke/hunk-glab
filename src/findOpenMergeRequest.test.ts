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

/** Answers a project lookup like gitlab.com does for a project that is no fork. */
const NO_FORK = (): Response => Response.json({ id: 34675721 });

const find = (
  respond: (url: string) => Response,
  checkout: { branch: string; sha: string; upstreamSha?: string } = CHECKOUT,
  respondToProject: (url: string) => Response = NO_FORK,
) => {
  const recorded = recordFetch((url) =>
    url.includes('/repository/commits/') ? respond(url) : respondToProject(url),
  );
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
    expect(
      requests.filter(({ url }) => url.includes('/repository/commits/')),
    ).toHaveLength(1);
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

  it('refuses to choose between two open merge requests', async () => {
    const other = {
      ...MATCH,
      iid: 4308,
      references: { full: 'gitlab-org/cli!4308' },
    };
    const { result } = find(() => Response.json([MATCH, other]));

    await expect(result).rejects.toMatchObject({
      message: `Multiple accessible open merge requests match gitlab-org/cli:feature/x@${SHA.slice(0, 12)}.`,
      suggestions: ['Pass the intended merge-request number explicitly.'],
    });
  });

  it('refuses matches that continue on a next page', async () => {
    const { result } = find(() =>
      Response.json([MATCH], { headers: { 'x-next-page': '2' } }),
    );

    await expect(result).rejects.toMatchObject({
      message: `GitLab returned paginated merge-request matches for gitlab-org/cli:feature/x@${SHA.slice(0, 12)}, so one merge request cannot be selected safely.`,
    });
  });

  it('stops after two matches, without trying the upstream or the parent', async () => {
    const other = {
      ...MATCH,
      iid: 4308,
      references: { full: 'gitlab-org/cli!4308' },
    };
    const { requests, result } = find(() => Response.json([MATCH, other]), {
      ...CHECKOUT,
      upstreamSha: UPSTREAM,
    });

    await expect(result).rejects.toMatchObject({
      message: expect.stringMatching(/^Multiple accessible/) as unknown,
    });
    expect(requests).toHaveLength(1);
  });

  describe('from a fork', () => {
    const FORK = { kind: 'path', path: 'scop/cli-2' } as const;
    const forkOf = (url: string): Response =>
      url.endsWith('/projects/scop%2Fcli-2')
        ? Response.json({ forked_from_project: { id: 34675721 } })
        : NO_FORK();

    const findFromFork = (respond: (url: string) => Response) => {
      const recorded = recordFetch((url) =>
        url.includes('/repository/commits/') ? respond(url) : forkOf(url),
      );
      return {
        requests: recorded.requests,
        result: findOpenMergeRequest({
          project: FORK,
          checkout: CHECKOUT,
          signal: new AbortController().signal,
          fetch: recorded.fetch,
          env: {},
        }),
      };
    };

    it('finds the merge request in the project the fork came from', async () => {
      const { requests, result } = findFromFork((url) =>
        url.includes('/projects/34675721/')
          ? Response.json([MATCH])
          : Response.json([]),
      );

      expect(await result).toEqual({ project: PROJECT, iid: 4307 });
      expect(requests.map(({ url }) => url.split('?')[0])).toEqual([
        `https://gitlab.com/api/v4/projects/scop%2Fcli-2/repository/commits/${SHA}/merge_requests`,
        'https://gitlab.com/api/v4/projects/scop%2Fcli-2',
        `https://gitlab.com/api/v4/projects/34675721/repository/commits/${SHA}/merge_requests`,
      ]);
    });

    it('names the fork when the parent has no match either', async () => {
      const { result } = findFromFork(() => Response.json([]));

      await expect(result).rejects.toMatchObject({
        message: `No accessible open merge request matches scop/cli-2:feature/x@${SHA.slice(0, 12)}.`,
      });
    });

    it('keeps a match in the fork itself, without asking the parent', async () => {
      const { requests, result } = findFromFork(() =>
        Response.json([
          { ...MATCH, references: { full: 'scop/cli-2!3' }, iid: 3 },
        ]),
      );

      expect(await result).toEqual({ project: FORK, iid: 3 });
      expect(requests).toHaveLength(1);
    });
  });
});
