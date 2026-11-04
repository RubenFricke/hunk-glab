import { describe, expect, it } from 'vitest';

import fitsReviewHeader from './fitsReviewHeader.ts';

const header = (title: string) =>
  ({
    kind: 'commit',
    provider: 'GitLab',
    title,
    revision: 'a'.repeat(40),
  }) as const;

describe('fitsReviewHeader', () => {
  it('accepts a header within 4 KiB', () => {
    expect(fitsReviewHeader(header('Fix the parser'))).toBe(true);
  });

  it('counts the JSON escapes, the way Hunk measures the header', () => {
    expect(fitsReviewHeader(header('"'.repeat(2000)))).toBe(false);
  });
});
