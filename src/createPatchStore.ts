import { rmSync } from 'node:fs';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DIRECTORY_PREFIX = 'hunk-gitlab-mr-';
const UNSAFE_FILENAME_CHARACTER = /[^A-Za-z0-9_.-]/g;

/** Temporary patches that stay for review reloads until the session ends. */
export interface PatchStore {
  /** Writes one patch in a new private directory and returns its path. */
  readonly write: (filename: string, bytes: Uint8Array) => Promise<string>;
  /** Removes one patch and its directory. */
  readonly remove: (patchPath: string) => Promise<void>;
  /** Removes every patch still held, synchronously, at shutdown. */
  readonly cleanup: () => void;
}

/**
 * Creates the store for the patches `hunk glab` hands to `hunk patch`. Each
 * patch gets its own directory that only its owner can read.
 *
 * @param temporaryRoot - The directory to create patch directories in.
 * @returns The store.
 */
const createPatchStore = (temporaryRoot: string): PatchStore => {
  const directories = new Set<string>();
  return {
    write: async (filename, bytes) => {
      const directory = await mkdtemp(join(temporaryRoot, DIRECTORY_PREFIX));
      directories.add(directory);
      try {
        await chmod(directory, 0o700);
        const patchPath = join(
          directory,
          filename.replace(UNSAFE_FILENAME_CHARACTER, '-'),
        );
        await writeFile(patchPath, bytes, { flag: 'wx', mode: 0o600 });
        return patchPath;
      } catch (error) {
        directories.delete(directory);
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
    },
    remove: async (patchPath) => {
      const directory = dirname(patchPath);
      directories.delete(directory);
      await rm(directory, { recursive: true, force: true });
    },
    cleanup: () => {
      for (const directory of directories) {
        rmSync(directory, { recursive: true, force: true });
      }
      directories.clear();
    },
  };
};

export default createPatchStore;
