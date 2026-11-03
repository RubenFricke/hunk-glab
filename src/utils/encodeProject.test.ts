import { describe, expect, it } from 'vitest';

import encodeProject from './encodeProject.ts';

describe('encodeProject', () => {
  it('encodes the whole path as one URL segment', () => {
    expect(
      encodeProject({
        kind: 'path',
        path: 'vbti-products/part-inspection/adam-one/adam-one-app',
      }),
    ).toBe('vbti-products%2Fpart-inspection%2Fadam-one%2Fadam-one-app');
  });

  it('passes a numeric id as it is', () => {
    expect(encodeProject({ kind: 'id', id: 34675721 })).toBe('34675721');
  });
});
