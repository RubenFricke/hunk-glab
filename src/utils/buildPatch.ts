import { HunkExtensionUserError } from 'hunkdiff/extension';

import isRecord from './isRecord.ts';
import quoteGitPath from './quoteGitPath.ts';

const MALFORMED = 'GitLab returned malformed diff data.';
const FILE_MODE = /^[0-7]{1,6}$/;

/**
 * Builds a Git patch from the files of GitLab's commit or compare diff API.
 * GitLab returns only the hunks of each file, so the headers `git diff` writes
 * are rebuilt from the paths, modes and flags. A changed file without hunks and
 * without a mode change can only be binary. A file GitLab collapsed or found
 * too large has no hunks at all, so it is refused rather than shown as
 * unchanged.
 *
 * @param value - The parsed JSON list of file diffs.
 * @returns The patch, or an empty string for no files.
 * @throws {HunkExtensionUserError} When the list is malformed or GitLab left
 *   out the diff of a file.
 */
const buildPatch = (value: unknown): string => {
  const malformed = (): HunkExtensionUserError =>
    new HunkExtensionUserError(MALFORMED);
  if (!Array.isArray(value)) {
    throw malformed();
  }

  return value
    .map((entry: unknown): string => {
      if (!isRecord(entry)) {
        throw malformed();
      }
      const {
        old_path: oldPath,
        new_path: newPath,
        a_mode: oldMode,
        b_mode: newMode,
        new_file: isNew,
        deleted_file: isDeleted,
        renamed_file: isRenamed,
        collapsed: isCollapsed,
        too_large: isTooLarge,
        diff,
      } = entry;
      if (
        typeof oldPath !== 'string' ||
        typeof newPath !== 'string' ||
        !oldPath ||
        !newPath ||
        typeof oldMode !== 'string' ||
        typeof newMode !== 'string' ||
        !FILE_MODE.test(oldMode) ||
        !FILE_MODE.test(newMode) ||
        typeof isNew !== 'boolean' ||
        typeof isDeleted !== 'boolean' ||
        typeof isRenamed !== 'boolean' ||
        typeof isCollapsed !== 'boolean' ||
        typeof isTooLarge !== 'boolean' ||
        typeof diff !== 'string'
      ) {
        throw malformed();
      }

      const oldName = quoteGitPath(`a/${oldPath}`);
      const newName = quoteGitPath(`b/${newPath}`);
      if (isCollapsed || isTooLarge) {
        throw new HunkExtensionUserError(
          `GitLab left out the diff of ${newName}, so the review would be incomplete.`,
        );
      }

      const lines = [`diff --git ${oldName} ${newName}`];
      if (isNew) {
        lines.push(`new file mode ${newMode}`);
      } else if (isDeleted) {
        lines.push(`deleted file mode ${oldMode}`);
      } else if (oldMode !== newMode) {
        lines.push(`old mode ${oldMode}`, `new mode ${newMode}`);
      }
      if (isRenamed) {
        lines.push(
          `rename from ${quoteGitPath(oldPath)}`,
          `rename to ${quoteGitPath(newPath)}`,
        );
      }
      if (diff) {
        /** Git ends a name with a space in a tab, so its end stays visible. */
        const withTab = (name: string): string =>
          name.includes(' ') ? `${name}\t` : name;
        lines.push(
          `--- ${isNew ? '/dev/null' : withTab(oldName)}`,
          `+++ ${isDeleted ? '/dev/null' : withTab(newName)}`,
          diff.endsWith('\n') ? diff.slice(0, -1) : diff,
        );
      } else if (!isNew && !isDeleted && !isRenamed && oldMode === newMode) {
        lines.push(`Binary files ${oldName} and ${newName} differ`);
      }
      return `${lines.join('\n')}\n`;
    })
    .join('');
};

export default buildPatch;
