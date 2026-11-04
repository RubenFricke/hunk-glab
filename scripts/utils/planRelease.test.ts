import { describe, expect, it } from 'vitest';

import planRelease from './planRelease.ts';

describe('planRelease', () => {
  it('raises the patch of the latest tag', () => {
    const plan = planRelease({
      bump: 'patch',
      packageVersion: '0.1.1',
      tags: ['v0.0.9', 'v0.1.1', 'v0.1.0'],
    });

    expect(plan).toEqual({
      version: '0.1.2',
      tag: 'v0.1.2',
      previousTag: 'v0.1.1',
    });
  });

  it('raises the minor and resets the patch', () => {
    const plan = planRelease({
      bump: 'minor',
      packageVersion: '0.1.1',
      tags: ['v0.1.0', 'v0.1.1'],
    });

    expect(plan.version).toBe('0.2.0');
  });

  it('raises the major and resets the rest', () => {
    const plan = planRelease({
      bump: 'major',
      packageVersion: '0.2.3',
      tags: ['v0.2.3'],
    });

    expect(plan.version).toBe('1.0.0');
  });

  it('starts from 0.0.0 when nothing was released yet', () => {
    const plan = planRelease({
      bump: 'minor',
      packageVersion: '0.0.0',
      tags: [],
    });

    expect(plan).toEqual({
      version: '0.1.0',
      tag: 'v0.1.0',
      previousTag: null,
    });
  });

  it('ignores tags that are not releases', () => {
    const plan = planRelease({
      bump: 'patch',
      packageVersion: '0.1.0',
      tags: ['latest', 'v0.2.0-beta.1', 'v0.1.0', '0.3.0'],
    });

    expect(plan.version).toBe('0.1.1');
    expect(plan.previousTag).toBe('v0.1.0');
  });

  it('orders versions by number, not by text', () => {
    const plan = planRelease({
      bump: 'patch',
      packageVersion: '0.10.0',
      tags: ['v0.9.0', 'v0.10.0'],
    });

    expect(plan.version).toBe('0.10.1');
  });

  it('refuses when package.json does not match the latest tag', () => {
    expect(() =>
      planRelease({
        bump: 'patch',
        packageVersion: '0.1.0',
        tags: ['v0.1.0', 'v0.1.1'],
      }),
    ).toThrow(
      'package.json says 0.1.0, but the latest release tag says 0.1.1.',
    );
  });
});
