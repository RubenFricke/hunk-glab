import { HunkExtensionUserError } from 'hunkdiff/extension';

import type { MergeRequestTarget } from './describeMergeRequest.ts';
import isRecord from './isRecord.ts';
import parseMergeRequestLocator from './parseMergeRequestLocator.ts';

/**
 * Reads the open merge requests GitLab lists for a commit. Each one is named by
 * its full reference, `group/project!123`, so a match in a fork's target
 * project keeps that project. Closed, merged and locked ones are left out, so a
 * merged merge request with the same commit is never chosen.
 *
 * @param value - The parsed JSON from GitLab.
 * @returns The open merge requests, in the order GitLab sent them.
 * @throws {HunkExtensionUserError} When the list or an entry is malformed.
 */
const parseMergeRequestMatches = (value: unknown): MergeRequestTarget[] => {
  const malformed = (): HunkExtensionUserError =>
    new HunkExtensionUserError(
      'GitLab returned malformed merge-request matches.',
    );
  if (!Array.isArray(value)) {
    throw malformed();
  }

  return value.flatMap((entry: unknown): MergeRequestTarget[] => {
    if (!isRecord(entry)) {
      throw malformed();
    }
    const { iid, state, references } = entry;
    if (typeof state !== 'string') {
      throw malformed();
    }
    if (state !== 'opened') {
      return [];
    }
    const full = isRecord(references) ? references.full : undefined;
    if (
      typeof iid !== 'number' ||
      !Number.isSafeInteger(iid) ||
      iid <= 0 ||
      typeof full !== 'string'
    ) {
      throw malformed();
    }
    let locator: ReturnType<typeof parseMergeRequestLocator>;
    try {
      locator = parseMergeRequestLocator(full);
    } catch {
      throw malformed();
    }
    if (locator.project?.kind !== 'path' || locator.iid !== iid) {
      throw malformed();
    }
    return [{ project: locator.project, iid }];
  });
};

export default parseMergeRequestMatches;
