import { describe, expect, it } from 'vitest';

import fetchGitLab, { type FetchGitLabOptions } from './fetchGitLab.ts';
import recordFetch from '../test/recordFetch.ts';

const NAME = 'gitlab-org/cli!4306';

const options = (
  fetch: FetchGitLabOptions['fetch'],
  signal = new AbortController().signal,
  env: FetchGitLabOptions['env'] = {},
): FetchGitLabOptions => ({
  apiPath: 'projects/gitlab-org%2Fcli/merge_requests/4306/raw_diffs',
  accept: 'text/plain',
  name: NAME,
  maxBytes: 16,
  tooLargeMessage: 'Too large.',
  emptyMessage: 'Empty.',
  signal,
  fetch,
  env,
});

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

describe('fetchGitLab', () => {
  it('asks gitlab.com for the path, without following redirects', async () => {
    const { requests, fetch } = recordFetch(() => new Response('diff'));
    const signal = new AbortController().signal;

    expect(decode(await fetchGitLab(options(fetch, signal)))).toBe('diff');
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.url).toBe(
      'https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/merge_requests/4306/raw_diffs',
    );
    expect(request?.init).toMatchObject({ redirect: 'manual', signal });
    expect(Object.fromEntries(new Headers(request?.init.headers))).toEqual({
      accept: 'text/plain',
      'user-agent': 'hunk-glab',
    });
  });

  it.each([
    [
      { GITLAB_TOKEN: 'glpat-first', GITLAB_ACCESS_TOKEN: 'glpat-second' },
      'glpat-first',
    ],
    [{ GITLAB_ACCESS_TOKEN: 'glpat-second' }, 'glpat-second'],
    [{ GITLAB_TOKEN: '', GITLAB_ACCESS_TOKEN: 'glpat-second' }, 'glpat-second'],
  ])('sends the token of %j as a bearer token', async (env, token) => {
    const { requests, fetch } = recordFetch(() => new Response('diff'));

    await fetchGitLab(options(fetch, undefined, env));

    expect(new Headers(requests[0]?.init.headers).get('authorization')).toBe(
      `Bearer ${token}`,
    );
  });

  it('rejects a token that cannot go in a header, without echoing it', async () => {
    const { requests, fetch } = recordFetch(() => new Response('diff'));

    const error = await fetchGitLab(
      options(fetch, undefined, { GITLAB_TOKEN: 'glpat-a\nb' }),
    ).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      message:
        'The configured GitLab token contains characters that cannot be sent in an HTTP header.',
      suggestions: [
        'Set GITLAB_TOKEN or GITLAB_ACCESS_TOKEN to the token value without line breaks.',
      ],
    });
    expect(JSON.stringify(error)).not.toContain('glpat');
    expect(requests).toEqual([]);
  });

  it('uses its own message for a 404 when one is given', async () => {
    const { fetch } = recordFetch(() => new Response('', { status: 404 }));

    await expect(
      fetchGitLab({
        ...options(fetch),
        notFoundMessage: 'GitLab could not find an accessible commit.',
      }),
    ).rejects.toMatchObject({
      message: 'GitLab could not find an accessible commit.',
      suggestions: [],
    });
  });

  it('refuses a redirect', async () => {
    const { fetch } = recordFetch(
      () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://evil.test/' },
        }),
    );

    await expect(fetchGitLab(options(fetch))).rejects.toMatchObject({
      message: `GitLab redirected the request for ${NAME}; refusing to forward credentials.`,
    });
  });

  it('names an unexpected status without the server body', async () => {
    const { fetch } = recordFetch(
      () => new Response('secret stack trace', { status: 500 }),
    );

    const error = await fetchGitLab(options(fetch)).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({
      message: `GitLab returned HTTP 500 for ${NAME}.`,
    });
    expect(String(error)).not.toContain('secret');
  });

  it('applies the byte limit and the empty check', async () => {
    const big = recordFetch(() => new Response('x'.repeat(17)));
    const empty = recordFetch(() => new Response(''));

    await expect(fetchGitLab(options(big.fetch))).rejects.toMatchObject({
      message: 'Too large.',
    });
    await expect(fetchGitLab(options(empty.fetch))).rejects.toMatchObject({
      message: 'Empty.',
    });
  });

  it('reports a network failure without its details', async () => {
    const { fetch } = recordFetch(() => {
      throw new Error('getaddrinfo ENOTFOUND token=abc');
    });

    await expect(fetchGitLab(options(fetch))).rejects.toMatchObject({
      message: 'GitLab could not be reached while loading the merge request.',
      suggestions: ['Check network access and retry.'],
    });
  });

  it('reports a body that breaks off as a network failure', async () => {
    const { fetch } = recordFetch(
      () =>
        new Response(
          new ReadableStream({
            pull: () => {
              throw new Error('socket hang up');
            },
          }),
        ),
    );

    await expect(fetchGitLab(options(fetch))).rejects.toMatchObject({
      message: 'GitLab could not be reached while loading the merge request.',
    });
  });

  it('reports a request that fails after a cancel as cancelled', async () => {
    const controller = new AbortController();
    const { fetch } = recordFetch(() => {
      controller.abort();
      throw new DOMException('aborted', 'AbortError');
    });

    await expect(
      fetchGitLab(options(fetch, controller.signal)),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
  });

  it.each([302, 401, 403, 404, 429, 500])(
    'keeps the token and the server body out of the HTTP %i message',
    async (status) => {
      const canary = 'glpat-canary-secret';
      const { fetch } = recordFetch(
        () => new Response(`echo ${canary}`, { status }),
      );

      const error = await fetchGitLab(
        options(fetch, undefined, { GITLAB_TOKEN: canary }),
      ).catch((caught: unknown) => caught);

      expect(error).toMatchObject({ name: 'HunkExtensionUserError' });
      expect(JSON.stringify(error)).not.toContain('canary');
      expect(String(error)).not.toContain('canary');
    },
  );
});
