import { describe, expect, it } from 'vitest';

import readBoundedString from './readBoundedString.ts';

describe('readBoundedString', () => {
  it('reads a field of plain text within the limit', () => {
    expect(readBoundedString({ title: 'café' }, 'title', 5)).toBe('café');
  });

  it.each([
    ['a container that is not an object', null],
    ['a missing field', {}],
    ['a field that is not text', { title: 1 }],
    ['an empty field', { title: '' }],
    ['a control character', { title: 'a\u001bb' }],
    ['more bytes than the limit', { title: 'caféé' }],
  ])('reads nothing from %s', (_name, container) => {
    expect(readBoundedString(container, 'title', 5)).toBeUndefined();
  });
});
