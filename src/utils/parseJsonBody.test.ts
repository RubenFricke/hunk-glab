import { describe, expect, it } from 'vitest';

import parseJsonBody from './parseJsonBody.ts';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('parseJsonBody', () => {
  it('parses a UTF-8 JSON body', () => {
    expect(parseJsonBody(encode('{"title":"café"}'), 'Malformed.')).toEqual({
      title: 'café',
    });
  });

  it.each([
    ['invalid JSON', encode('{"title":')],
    ['invalid UTF-8', new Uint8Array([0x7b, 0xff, 0x7d])],
  ])('rejects %s with the given message', (_name, bytes) => {
    expect(() => parseJsonBody(bytes, 'Malformed.')).toThrow(
      expect.objectContaining({
        name: 'HunkExtensionUserError',
        message: 'Malformed.',
      }),
    );
  });
});
