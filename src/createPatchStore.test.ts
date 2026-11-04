import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import createPatchStore from './createPatchStore.ts';

const PATCH = new TextEncoder().encode('diff --git a/a b/a\n');

describe('createPatchStore', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'hunk-glab-store-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes the patch under a safe name in its own directory', async () => {
    const store = createPatchStore(root);

    const patchPath = await store.write('../group project-mr-1.diff', PATCH);

    expect(dirname(dirname(patchPath))).toBe(root);
    expect(basename(dirname(patchPath))).toMatch(/^hunk-gitlab-mr-/);
    expect(basename(patchPath)).toBe('..-group-project-mr-1.diff');
    expect(await readFile(patchPath)).toEqual(Buffer.from(PATCH));
  });

  it.skipIf(process.platform === 'win32')(
    'keeps the patch readable by its owner only',
    async () => {
      const patchPath = await createPatchStore(root).write('a.diff', PATCH);

      expect((await stat(dirname(patchPath))).mode & 0o777).toBe(0o700);
      expect((await stat(patchPath)).mode & 0o777).toBe(0o600);
    },
  );

  it('removes one patch with its directory', async () => {
    const store = createPatchStore(root);
    const patchPath = await store.write('a.diff', PATCH);

    await store.remove(patchPath);

    expect(existsSync(dirname(patchPath))).toBe(false);
  });

  it('cleans up every patch it still holds', async () => {
    const store = createPatchStore(root);
    await store.write('a.diff', PATCH);
    await store.write('b.diff', PATCH);

    store.cleanup();

    expect(await readdir(root)).toEqual([]);
  });

  it('leaves no directory behind when the write fails', async () => {
    const store = createPatchStore(root);

    await expect(store.write('', PATCH)).rejects.toThrow();
    expect(await readdir(root)).toEqual([]);
  });
});
