import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import createGlabCommand from './createGlabCommand.ts';
import createPatchStore, { type PatchStore } from './createPatchStore.ts';
import GLAB_CLI_REFERENCE from './glabCliReference.ts';
import recordCliContext from '../test/recordCliContext.ts';
import recordFetch from '../test/recordFetch.ts';
import respondWithMergeRequest from '../test/respondWithMergeRequest.ts';
import renderGlabHelp from './utils/renderGlabHelp.ts';

const DIFF = 'diff --git a/a b/a\n';
const MR_ARGS = ['mr', '4306', '--repo', 'gitlab-org/cli'];
const respond = respondWithMergeRequest({
  path: 'gitlab-org/cli',
  iid: 4306,
  diff: DIFF,
});

/** A fetch that fails the test when a command reaches the network. */
const refuseFetch = (): Promise<Response> =>
  Promise.reject(new Error('The command must not reach the network.'));

/** Fails the test when a command reads origin it should not need. */
const refuseOrigin = (): Promise<string> =>
  Promise.reject(new Error('The command must not read origin.'));

describe('createGlabCommand', () => {
  let root = '';
  let patches: PatchStore;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'hunk-glab-command-'));
    patches = createPatchStore(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.each([[[]], [['--help']], [['-h']]])(
    'prints the overview help for %j and exits',
    async (args) => {
      const { stdout, stderr, ctx } = recordCliContext();

      const result = await createGlabCommand({
        fetch: refuseFetch,
        env: {},
        readOrigin: refuseOrigin,
        patches,
      })(args, ctx);

      expect(result).toEqual({ kind: 'exit' });
      expect(stdout.join('')).toBe(renderGlabHelp(GLAB_CLI_REFERENCE));
      expect(stderr).toEqual([]);
    },
  );

  it('names an unknown command and prints nothing', async () => {
    const { stdout, ctx } = recordCliContext();

    await expect(
      createGlabCommand({
        fetch: refuseFetch,
        env: {},
        readOrigin: refuseOrigin,
        patches,
      })(['foo', '1'], ctx),
    ).rejects.toMatchObject({
      name: 'HunkExtensionUserError',
      message: 'Unknown GitLab command: foo',
      suggestions: ['Run `hunk glab --help` to list available commands.'],
    });
    expect(stdout).toEqual([]);
  });

  it('points `hunk glab pr` at merge requests', async () => {
    const { ctx } = recordCliContext();

    await expect(
      createGlabCommand({
        fetch: refuseFetch,
        env: {},
        readOrigin: refuseOrigin,
        patches,
      })(['pr', '1'], ctx),
    ).rejects.toMatchObject({
      message: 'Unknown GitLab command: pr',
      suggestions: ['GitLab calls these merge requests: run `hunk glab mr`.'],
    });
  });

  it('rejects a command with control characters', async () => {
    const { ctx } = recordCliContext();

    await expect(
      createGlabCommand({
        fetch: refuseFetch,
        env: {},
        readOrigin: refuseOrigin,
        patches,
      })(['\u001b[2Jmr'], ctx),
    ).rejects.toMatchObject({
      message: 'GitLab command cannot contain control characters.',
    });
  });

  it('hands the fetched merge request to hunk patch', async () => {
    const { stderr, ctx } = recordCliContext();
    const { fetch } = recordFetch(respond);

    const result = await createGlabCommand({
      fetch,
      env: {},
      readOrigin: refuseOrigin,
      patches,
    })([...MR_ARGS, '--', '--mode', 'unified'], ctx);

    expect(result).toMatchObject({
      kind: 'delegate',
      review: { id: '!4306', repository: 'gitlab-org/cli' },
    });
    if (result.kind !== 'delegate') {
      return;
    }
    const [command, patchPath, ...patchArgs] = result.argv;
    expect(command).toBe('patch');
    expect(patchArgs).toEqual(['--mode', 'unified']);
    expect(await readFile(patchPath ?? '', 'utf8')).toBe(DIFF);
    expect(stderr).toEqual([
      'Fetching GitLab merge request gitlab-org/cli!4306…\n',
      `Opening ${DIFF.length.toLocaleString()} bytes in Hunk…\n`,
    ]);
  });

  it('removes the patch when the run is cancelled after writing it', async () => {
    const controller = new AbortController();
    const { ctx } = recordCliContext({ signal: controller.signal });
    const { fetch } = recordFetch(respond);
    const abortingPatches: PatchStore = {
      ...patches,
      write: async (filename, bytes) => {
        const patchPath = await patches.write(filename, bytes);
        controller.abort();
        return patchPath;
      },
    };

    await expect(
      createGlabCommand({
        fetch,
        env: {},
        readOrigin: refuseOrigin,
        patches: abortingPatches,
      })(MR_ARGS, ctx),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
    expect(await readdir(root)).toEqual([]);
  });

  it('removes the patch when the run is cancelled while opening', async () => {
    const controller = new AbortController();
    const { ctx } = recordCliContext({
      signal: controller.signal,
      onStderr: (chunk) => {
        if (chunk.startsWith('Opening')) {
          controller.abort();
        }
      },
    });
    const { fetch } = recordFetch(respond);

    await expect(
      createGlabCommand({ fetch, env: {}, readOrigin: refuseOrigin, patches })(
        MR_ARGS,
        ctx,
      ),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
    expect(await readdir(root)).toEqual([]);
  });

  it('writes no patch when the run is cancelled during the fetch', async () => {
    const controller = new AbortController();
    const { ctx } = recordCliContext({ signal: controller.signal });
    const { fetch } = recordFetch((url) => {
      controller.abort();
      return respond(url);
    });

    await expect(
      createGlabCommand({ fetch, env: {}, readOrigin: refuseOrigin, patches })(
        MR_ARGS,
        ctx,
      ),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
    expect(await readdir(root)).toEqual([]);
  });

  it('writes no patch when the run is cancelled after the fetch', async () => {
    const controller = new AbortController();
    const { ctx } = recordCliContext({ signal: controller.signal });
    const { fetch } = recordFetch((url) => {
      if (!url.endsWith('/raw_diffs')) {
        return respond(url);
      }
      /** A reader that cancels the run exactly when the body ends. */
      const chunks = [new TextEncoder().encode(DIFF)];
      const response = new Response(DIFF);
      Object.defineProperty(response, 'body', {
        value: {
          getReader: () => ({
            read: () => {
              const chunk = chunks.shift();
              if (chunk === undefined) {
                controller.abort();
                return Promise.resolve({ done: true, value: undefined });
              }
              return Promise.resolve({ done: false, value: chunk });
            },
            cancel: () => Promise.resolve(),
            releaseLock: () => undefined,
          }),
        },
      });
      return response;
    });

    await expect(
      createGlabCommand({
        fetch,
        env: {},
        readOrigin: refuseOrigin,
        patches,
      })(MR_ARGS, ctx),
    ).rejects.toMatchObject({ message: 'GitLab diff loading was cancelled.' });
    expect(await readdir(root)).toEqual([]);
  });
});
