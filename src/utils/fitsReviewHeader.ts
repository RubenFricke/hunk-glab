import type { ExtensionReviewDescriptor } from 'hunkdiff/extension';

/** Hunk refuses the whole review when its header is larger than this. */
const MAX_HEADER_BYTES = 4 * 1024;

/**
 * Checks a review header against Hunk's total limit, measured as Hunk does: the
 * UTF-8 size of its JSON, escapes included.
 *
 * @param review - The review header.
 * @returns True when Hunk accepts its size.
 */
const fitsReviewHeader = (review: ExtensionReviewDescriptor): boolean =>
  new TextEncoder().encode(JSON.stringify(review)).byteLength <=
  MAX_HEADER_BYTES;

export default fitsReviewHeader;
