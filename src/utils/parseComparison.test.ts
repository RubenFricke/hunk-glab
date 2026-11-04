import { describe, expect, it } from 'vitest';

import parseComparison from './parseComparison.ts';

const TARGET = {
  project: { kind: 'path', path: 'gitlab-org/cli' },
  base: 'v1.126.0',
  head: 'v1.127.0',
} as const;
const URL = 'https://gitlab.com/gitlab-org/cli/-/compare/4dd0d32...2e352a1';
const MALFORMED = 'GitLab returned a malformed comparison.';

const commit = (index: number, title = `Commit ${String(index)}`) => ({
  id: String(index).padStart(40, '0'),
  short_id: String(index).padStart(8, '0'),
  title,
  author_name: 'Ruben',
  authored_date: `2026-11-0${String(Math.min(index, 9))}T10:00:00.000+01:00`,
  web_url: `https://gitlab.com/gitlab-org/cli/-/commit/${String(index).padStart(40, '0')}`,
});

const comparison = (fields: Record<string, unknown> = {}) => ({
  commits: [commit(1), commit(2)],
  diffs: [{ new_path: 'a.txt' }],
  compare_timeout: false,
  compare_same_ref: false,
  web_url: URL,
  ...fields,
});

describe('parseComparison', () => {
  it('returns the file diffs and describes the comparison, newest commit first', () => {
    expect(parseComparison(comparison(), TARGET)).toEqual({
      files: [{ new_path: 'a.txt' }],
      projectPath: 'gitlab-org/cli',
      review: {
        kind: 'comparison',
        provider: 'GitLab',
        title: 'v1.126.0...v1.127.0',
        url: URL,
        base: 'v1.126.0',
        head: 'v1.127.0',
        commitCount: 2,
        commits: [
          {
            title: 'Commit 2',
            author: 'Ruben',
            authoredAt: '2026-11-02T10:00:00.000+01:00',
            revision: '0'.repeat(39) + '2',
            displayRevision: '00000002',
          },
          {
            title: 'Commit 1',
            author: 'Ruben',
            authoredAt: '2026-11-01T10:00:00.000+01:00',
            revision: '0'.repeat(39) + '1',
            displayRevision: '00000001',
          },
        ],
      },
    });
  });

  it('lists at most 8 commits and keeps the header within 4 KiB', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      commit(index + 1, 'x'.repeat(900)),
    );
    const { review } = parseComparison(comparison({ commits: many }), TARGET);

    expect(review?.commitCount).toBe(20);
    expect(review?.commits?.length).toBeLessThan(8);
    expect(
      new TextEncoder().encode(JSON.stringify(review)).byteLength,
    ).toBeLessThanOrEqual(4096);
  });

  it('leaves out a commit that cannot be shown', () => {
    const { review } = parseComparison(
      comparison({ commits: [commit(1, 'a\tb'), commit(2)] }),
      TARGET,
    );

    expect(review?.commits?.map(({ title }) => title)).toEqual(['Commit 2']);
    expect(review?.commitCount).toBe(2);
  });

  it('leaves out the header when a ref is too long to show', () => {
    expect(
      parseComparison(comparison(), { ...TARGET, head: 'h'.repeat(513) }),
    ).not.toHaveProperty('review');
  });

  it('takes the project path from the page link for a project given by id', () => {
    expect(
      parseComparison(comparison(), {
        ...TARGET,
        project: { kind: 'id', id: 34675721 },
      }),
    ).toMatchObject({ projectPath: 'gitlab-org/cli' });
  });

  it('refuses a comparison that timed out', () => {
    expect(() =>
      parseComparison(comparison({ compare_timeout: true }), TARGET),
    ).toThrow(
      expect.objectContaining({
        message:
          'GitLab timed out comparing v1.126.0...v1.127.0, so the diff may be incomplete.',
      }),
    );
  });

  it.each([
    ['not an object', []],
    ['no diff list', comparison({ diffs: null })],
    ['no commit list', comparison({ commits: {} })],
    [
      'a timeout flag that is not a boolean',
      comparison({ compare_timeout: 'no' }),
    ],
    [
      'a link to another project',
      comparison({ web_url: 'https://gitlab.com/other/cli/-/compare/a...b' }),
    ],
    [
      'a link to another host',
      comparison({
        web_url: 'https://evil.test/gitlab-org/cli/-/compare/a...b',
      }),
    ],
  ])('rejects %s', (_name, value) => {
    expect(() => parseComparison(value, TARGET)).toThrow(
      expect.objectContaining({ message: MALFORMED }),
    );
  });
});
