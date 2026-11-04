import { describe, expect, it } from 'vitest';

import parseCompareInvocation from './parseCompareInvocation.ts';

describe('parseCompareInvocation', () => {
  it('reads base, head, --repo and the patch options', () => {
    expect(
      parseCompareInvocation([
        'v1.126.0...feature/x',
        '--repo',
        'gitlab-org/cli',
        '--',
        '--mode',
        'unified',
      ]),
    ).toEqual({
      base: 'v1.126.0',
      head: 'feature/x',
      project: { kind: 'path', path: 'gitlab-org/cli' },
      patchArgs: ['--mode', 'unified'],
    });
  });

  it('leaves the project out without --repo', () => {
    expect(parseCompareInvocation(['main...feature'])).toEqual({
      base: 'main',
      head: 'feature',
      patchArgs: [],
    });
  });

  it.each([
    [[], 'Specify one base...head comparison.'],
    [['main..feature'], 'Comparisons must use exactly one base...head range.'],
    [['main...'], 'Comparisons must use exactly one base...head range.'],
    [['a...b...c'], 'Comparisons must use exactly one base...head range.'],
    [
      ['main...a b'],
      'Comparison refs are not valid Git refs or exceed 1024 UTF-8 bytes.',
    ],
    [
      ['main...a..b'],
      'Comparison refs are not valid Git refs or exceed 1024 UTF-8 bytes.',
    ],
    [['main...x', 'a...b'], 'Specify exactly one comparison.'],
    [['main...x', '--straight'], 'Unknown compare option: --straight'],
    [['main...x', '--repo', 'cli'], 'Invalid GitLab project: cli'],
  ])('rejects %j', (args, message) => {
    expect(() => parseCompareInvocation(args)).toThrow(
      expect.objectContaining({ message }),
    );
  });
});
