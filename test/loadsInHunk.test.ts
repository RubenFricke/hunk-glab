import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HUNK_EXTENSION_API_VERSION } from 'hunkdiff/extension';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import GLAB_CLI_REFERENCE from '../src/glabCliReference.ts';
import renderGlabHelp from '../src/utils/renderGlabHelp.ts';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HUNK_PACKAGE = join(PACKAGE_ROOT, 'node_modules', 'hunkdiff');
const HUNK_TIMEOUT_MS = 15_000;

/** Not a public contract of Hunk; only the broken-extension test relies on it. */
const LOAD_FAILED = 'One or more extensions failed to load';

interface HunkRun {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

const findHunkCli = async (): Promise<string> => {
  const manifest = JSON.parse(
    await readFile(join(HUNK_PACKAGE, 'package.json'), 'utf8'),
  ) as { bin: string | Record<string, string> };
  const bin =
    typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.hunk;
  if (!bin) {
    throw new Error('The hunkdiff package has no hunk binary.');
  }
  return join(HUNK_PACKAGE, bin);
};

/**
 * Runs `hunk --extension <dir> glab --help` without a terminal. The help needs
 * no Git, network or review, so Hunk prints it and stops.
 */
const runGlabHelp = async (
  workDir: string,
  extensionDir: string,
): Promise<HunkRun> => {
  const cli = await findHunkCli();
  const child = spawn(
    process.execPath,
    [cli, '--extension', extensionDir, 'glab', '--help'],
    {
      cwd: workDir,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: join(workDir, 'config'),
        XDG_STATE_HOME: join(workDir, 'state'),
        HUNK_MCP_DISABLE: '1',
        HUNK_DISABLE_UPDATE_NOTICE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  const code = await new Promise<number | null>((resolveExit, rejectExit) => {
    const timer = setTimeout(() => {
      child.kill();
      rejectExit(new Error(`Hunk did not stop.\n${stdout}${stderr}`));
    }, HUNK_TIMEOUT_MS);
    child.on('error', (error) => {
      clearTimeout(timer);
      rejectExit(error);
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolveExit(exitCode);
    });
  });
  return { code, stdout, stderr };
};

describe('hunk-glab in Hunk', () => {
  let workDir = '';

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'hunk-glab-load-'));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it(
    'registers hunk glab and prints its help in the pinned Hunk',
    async () => {
      const run = await runGlabHelp(workDir, PACKAGE_ROOT);

      expect(run).toEqual({
        code: 0,
        stdout: renderGlabHelp(GLAB_CLI_REFERENCE),
        stderr: '',
      });
    },
    HUNK_TIMEOUT_MS * 2,
  );

  it(
    'reports an extension that throws while it loads',
    async () => {
      const brokenDir = join(workDir, 'broken-extension');
      await mkdir(brokenDir);
      await writeFile(
        join(brokenDir, 'package.json'),
        JSON.stringify({ hunk: { extensions: ['./index.ts'] } }),
      );
      await writeFile(
        join(brokenDir, 'index.ts'),
        "export default () => { throw new Error('broken'); };\n",
      );

      const run = await runGlabHelp(workDir, brokenDir);

      expect(run.code).not.toBe(0);
      expect(run.stdout + run.stderr).toContain(LOAD_FAILED);
    },
    HUNK_TIMEOUT_MS * 2,
  );

  it('pins a Hunk whose extension API covers the manifest', async () => {
    const manifest = JSON.parse(
      await readFile(join(PACKAGE_ROOT, 'package.json'), 'utf8'),
    ) as { hunk: { apiVersion: number } };

    expect(HUNK_EXTENSION_API_VERSION).toBeGreaterThanOrEqual(
      manifest.hunk.apiVersion,
    );
  });
});
