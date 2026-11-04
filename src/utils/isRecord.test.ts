import { describe, expect, it } from 'vitest';

import isRecord from './isRecord.ts';

describe('isRecord', () => {
  it('accepts a plain object', () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it.each([null, undefined, [], 'text', 1])('rejects %j', (value) => {
    expect(isRecord(value)).toBe(false);
  });
});
