import { describe, expect, it } from 'vitest';

import assertSafeArgument from './assertSafeArgument.ts';

describe('assertSafeArgument', () => {
  it('accepts plain text', () => {
    expect(() => {
      assertSafeArgument('group/project', 'GitLab project');
    }).not.toThrow();
  });

  it('rejects control characters without echoing the value', () => {
    expect(() => {
      assertSafeArgument('\u001b]0;owned\u0007', 'GitLab project');
    }).toThrow(
      expect.objectContaining({
        message: 'GitLab project cannot contain control characters.',
      }),
    );
  });
});
