import { describe, expect, it } from 'vitest';

import fetchMergeRequestMetadata from './fetchMergeRequestMetadata.ts';
import recordFetch from '../test/recordFetch.ts';

const TARGET = {
  project: { kind: 'path', path: 'gitlab-org/cli' },
  iid: 4306,
} as const;

const METADATA = {
  title: 'Update goldmark',
  web_url: 'https://gitlab.com/gitlab-org/cli/-/merge_requests/4306',
  author: { username: 'bot' },
  target_branch: 'main',
  source_branch: 'renovate/goldmark',
  state: 'merged',
  draft: false,
};

const fetchWith = (
  body: string | Uint8Array,
  headers: Record<string, string> = {},
) =>
  fetchMergeRequestMetadata({
    target: TARGET,
    signal: new AbortController().signal,
    fetch: recordFetch(() => new Response(body, { headers })).fetch,
  });

describe('fetchMergeRequestMetadata', () => {
  it('asks for the merge request as JSON and describes it', async () => {
    const { requests, fetch } = recordFetch(
      () => new Response(JSON.stringify(METADATA)),
    );

    const review = await fetchMergeRequestMetadata({
      target: TARGET,
      signal: new AbortController().signal,
      fetch,
    });

    expect(requests.map(({ url }) => url)).toEqual([
      'https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/merge_requests/4306',
    ]);
    expect(new Headers(requests[0]?.init.headers).get('accept')).toBe(
      'application/json',
    );
    expect(review).toMatchObject({ title: 'Update goldmark', state: 'merged' });
  });

  it('rejects metadata over 1 MiB', async () => {
    await expect(
      fetchWith('{}', { 'content-length': String(1024 * 1024 + 1) }),
    ).rejects.toMatchObject({
      message: 'GitLab merge-request metadata exceeds the 1 MiB safety limit.',
    });
  });

  it('rejects empty metadata', async () => {
    await expect(fetchWith('')).rejects.toMatchObject({
      message: 'GitLab returned empty merge-request metadata.',
    });
  });

  it.each([
    ['invalid JSON', '{"title":'],
    ['invalid UTF-8', new Uint8Array([0x7b, 0xff, 0x7d])],
  ])('rejects %s', async (_name, body) => {
    await expect(fetchWith(body)).rejects.toMatchObject({
      message: 'GitLab returned malformed merge-request metadata.',
    });
  });
});
