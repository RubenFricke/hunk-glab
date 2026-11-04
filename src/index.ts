import { tmpdir } from 'node:os';

import type { HunkExtensionAPI } from 'hunkdiff/extension';

import createGlabCommand from './createGlabCommand.ts';
import createPatchStore from './createPatchStore.ts';
import GLAB_CLI_REFERENCE from './glabCliReference.ts';
import readGitOrigin from './readGitOrigin.ts';

/**
 * Registers `hunk glab` with Hunk.
 *
 * @param hunk - The Hunk extension API.
 */
const glabExtension = (hunk: HunkExtensionAPI): void => {
  const patches = createPatchStore(tmpdir());
  const { name, summary, usage } = GLAB_CLI_REFERENCE;
  hunk.registerCliCommand(
    { name, summary, usage },
    createGlabCommand({
      fetch,
      env: process.env,
      readOrigin: readGitOrigin,
      patches,
    }),
  );
  hunk.on('shutdown', patches.cleanup);
};

export default glabExtension;
