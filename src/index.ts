import type { HunkExtensionAPI } from 'hunkdiff/extension';

/**
 * Registers hunk-glab with Hunk.
 *
 * @param _hunk - The Hunk extension API.
 */
const glabExtension = (_hunk: HunkExtensionAPI): void => {
  /** The scaffold only loads; the next commits register the command. */
};

export default glabExtension;
