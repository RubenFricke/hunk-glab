import { describe, expect, it } from 'vitest';

import parseMergeRequestIid from './parseMergeRequestIid.ts';

describe('parseMergeRequestIid', () => {
  it.each([
    ['123', 123],
    ['!123', 123],
    ['1', 1],
  ])('reads %s', (value, iid) => {
    expect(parseMergeRequestIid(value)).toBe(iid);
  });

  it.each(['0', '012', '!', '!!1', '#1', '-1', '1.5', '12a', ''])(
    'rejects %j',
    (value) => {
      expect(() => parseMergeRequestIid(value)).toThrow(
        expect.objectContaining({
          message: `Invalid merge-request number: ${value}`,
        }),
      );
    },
  );

  it('rejects a number beyond the safe integers', () => {
    expect(() => parseMergeRequestIid('9007199254740993')).toThrow(
      expect.objectContaining({
        message: 'Merge-request number is too large: 9007199254740993',
      }),
    );
  });

  it('rejects control characters without echoing them', () => {
    expect(() => parseMergeRequestIid('1\u001b[2J')).toThrow(
      expect.objectContaining({
        message: 'Merge-request number cannot contain control characters.',
      }),
    );
  });
});
