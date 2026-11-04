import {
  type ExtensionChangeRequestReviewDescriptor,
  HunkExtensionUserError,
} from 'hunkdiff/extension';

import type { MergeRequestTarget } from './describeMergeRequest.ts';
import hasControlCharacter from './hasControlCharacter.ts';
import isRecord from './isRecord.ts';
import parseGitLabPageUrl from './parseGitLabPageUrl.ts';

const MAX_TITLE_BYTES = 2 * 1024;
const MAX_URL_BYTES = 2 * 1024;
const MAX_NAME_BYTES = 512;

type ShownState = NonNullable<ExtensionChangeRequestReviewDescriptor['state']>;

/** Hunk knows open, closed and merged; a locked merge request is closed. */
const SHOWN_STATES = {
  opened: 'open',
  merged: 'merged',
  closed: 'closed',
  locked: 'closed',
} as const satisfies Record<string, ShownState>;

/**
 * Turns the GitLab metadata of a merge request into the header Hunk shows above
 * the review. Every field is checked, because it reaches the terminal. For a
 * project given by id, the project path comes from the page URL.
 *
 * @param value - The parsed JSON from GitLab.
 * @param target - The merge request that was asked for.
 * @returns The review descriptor.
 * @throws {HunkExtensionUserError} When a field is missing, malformed, too
 *   long, has a control character, or the page URL is not the merge request's.
 */
const parseMergeRequestMetadata = (
  value: unknown,
  target: MergeRequestTarget,
): ExtensionChangeRequestReviewDescriptor => {
  const malformed = (): HunkExtensionUserError =>
    new HunkExtensionUserError(
      'GitLab returned malformed merge-request metadata.',
    );
  const isKnownState = (state: unknown): state is keyof typeof SHOWN_STATES =>
    typeof state === 'string' && Object.hasOwn(SHOWN_STATES, state);
  const readString = (
    container: unknown,
    field: string,
    maxBytes: number,
  ): string => {
    const text = isRecord(container) ? container[field] : undefined;
    if (
      typeof text !== 'string' ||
      text.length === 0 ||
      hasControlCharacter(text) ||
      new TextEncoder().encode(text).byteLength > maxBytes
    ) {
      throw malformed();
    }
    return text;
  };

  if (!isRecord(value)) {
    throw malformed();
  }
  const title = readString(value, 'title', MAX_TITLE_BYTES);
  const pageUrl = readString(value, 'web_url', MAX_URL_BYTES);
  const author = readString(value.author, 'username', MAX_NAME_BYTES);
  const base = readString(value, 'target_branch', MAX_NAME_BYTES);
  const head = readString(value, 'source_branch', MAX_NAME_BYTES);
  const { state, draft } = value;
  if (
    !isKnownState(state) ||
    (draft !== undefined && typeof draft !== 'boolean')
  ) {
    throw malformed();
  }

  const page = parseGitLabPageUrl(pageUrl, 'merge_requests');
  if (
    page?.ref !== String(target.iid) ||
    (target.project.kind === 'path' &&
      page.path.toLowerCase() !== target.project.path.toLowerCase())
  ) {
    throw malformed();
  }

  return {
    kind: 'change-request',
    provider: 'GitLab',
    title,
    url: pageUrl,
    id: `!${String(target.iid)}`,
    repository:
      target.project.kind === 'path' ? target.project.path : page.path,
    author,
    base,
    head,
    state: SHOWN_STATES[state],
    ...(draft === undefined ? {} : { draft }),
  };
};

export default parseMergeRequestMetadata;
