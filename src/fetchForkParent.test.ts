import { describe, expect, it } from 'vitest';

import fetchForkParent from './fetchForkParent.ts';
import recordFetch from '../test/recordFetch.ts';

const FORK = { kind: 'path', path: 'scop/cli-2' } as const;

const fetchWith = (respond: () => Response) => {
  const recorded = recordFetch(respond);
  return {
    requests: recorded.requests,
    result: fetchForkParent({
      project: FORK,
      signal: new AbortController().signal,
      fetch: recorded.fetch,
      env: {},
    }),
  };
};

describe('fetchForkParent', () => {
  it('returns the project a fork was forked from', async () => {
    const { requests, result } = fetchWith(() =>
      Response.json({
        id: 85083980,
        forked_from_project: {
          id: 34675721,
          path_with_namespace: 'gitlab-org/cli',
        },
      }),
    );

    expect(await result).toEqual({ kind: 'id', id: 34675721 });
    expect(requests.map(({ url }) => url)).toEqual([
      'https://gitlab.com/api/v4/projects/scop%2Fcli-2',
    ]);
  });

  it.each([
    ['no fork field', { id: 34675721 }],
    ['a null fork field', { id: 34675721, forked_from_project: null }],
  ])('returns nothing for a project with %s', async (_name, body) => {
    expect(await fetchWith(() => Response.json(body)).result).toBeUndefined();
  });

  it.each([
    ['not an object', []],
    ['a fork field without an id', { forked_from_project: {} }],
    [
      'an id that is not a positive integer',
      { forked_from_project: { id: -1 } },
    ],
  ])('rejects project metadata with %s', async (_name, body) => {
    await expect(
      fetchWith(() => Response.json(body)).result,
    ).rejects.toMatchObject({
      message: 'GitLab returned malformed project metadata.',
    });
  });
});
