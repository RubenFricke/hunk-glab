import { describe, expect, it } from 'vitest';

import formatHelpRow from './formatHelpRow.ts';

describe('formatHelpRow', () => {
  it('aligns the description after the term', () => {
    expect(formatHelpRow('123', 'infer the project', 8)).toBe(
      '  123     infer the project',
    );
  });

  it('shows a term without a description on its own', () => {
    expect(formatHelpRow('https://gitlab.com/a/b/-/merge_requests/1')).toBe(
      '  https://gitlab.com/a/b/-/merge_requests/1',
    );
  });

  it('starts the description after the default term column', () => {
    expect(formatHelpRow('a', 'b').indexOf('b')).toBe(39);
  });
});
