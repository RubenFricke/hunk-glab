import {
  type ExtensionComparisonCommitDescriptor,
  type ExtensionComparisonReviewDescriptor,
  HunkExtensionUserError,
} from 'hunkdiff/extension';

import fitsReviewHeader from './fitsReviewHeader.ts';
import isRecord from './isRecord.ts';
import parseGitLabPageUrl from './parseGitLabPageUrl.ts';
import type { GitLabProject } from './parseGitLabProject.ts';
import readBoundedString from './readBoundedString.ts';

/** Hunk lists at most this many commits; more fails the run. */
const MAX_HEADER_COMMITS = 8;
const MAX_TITLE_BYTES = 2 * 1024;
const MAX_URL_BYTES = 2 * 1024;
const MAX_NAME_BYTES = 512;
const MAX_REVISION_BYTES = 64;
const MAX_DATE_BYTES = 128;
const FULL_SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

/** One comparison as the user named it. */
interface ComparisonTarget {
  readonly project: GitLabProject;
  readonly base: string;
  readonly head: string;
}

/** The file diffs of a comparison and its review header. */
interface Comparison {
  /** The file diffs, still unchecked, for the patch. */
  readonly files: unknown[];
  /** Left out when a ref is too long for Hunk's header. */
  readonly review?: ExtensionComparisonReviewDescriptor;
  /** From the page link, so a project given by id still has a path. */
  readonly projectPath: string;
}

/**
 * Reads GitLab's comparison of two refs. A comparison GitLab cut short is
 * refused. The header lists the newest commits, as many as fit Hunk's limits; a
 * commit that cannot be shown is left out of the list, not out of the count.
 *
 * @param value - The parsed JSON from GitLab.
 * @param target - The comparison that was asked for.
 * @param incompleteSuggestion - Where to get the full diff when GitLab cut the
 *   comparison short.
 * @returns The file diffs, the header and the project path.
 * @throws {HunkExtensionUserError} When the comparison timed out or is
 *   malformed.
 */
const parseComparison = (
  value: unknown,
  target: ComparisonTarget,
  incompleteSuggestion?: string,
): Comparison => {
  const malformed = (): HunkExtensionUserError =>
    new HunkExtensionUserError('GitLab returned a malformed comparison.');
  if (!isRecord(value)) {
    throw malformed();
  }
  const { diffs, commits, compare_timeout: isTimedOut } = value;
  const url = readBoundedString(value, 'web_url', MAX_URL_BYTES);
  const page = url === undefined ? null : parseGitLabPageUrl(url, 'compare');
  if (
    !Array.isArray(diffs) ||
    !Array.isArray(commits) ||
    typeof isTimedOut !== 'boolean' ||
    url === undefined ||
    page === null ||
    (target.project.kind === 'path' &&
      page.path.toLowerCase() !== target.project.path.toLowerCase())
  ) {
    throw malformed();
  }
  const range = `${target.base}...${target.head}`;
  if (isTimedOut) {
    throw new HunkExtensionUserError(
      `GitLab timed out comparing ${range}, so the diff may be incomplete.`,
      {
        suggestions:
          incompleteSuggestion === undefined ? [] : [incompleteSuggestion],
      },
    );
  }

  const projectPath =
    target.project.kind === 'path' ? target.project.path : page.path;
  const sizeOf = (text: string): number =>
    new TextEncoder().encode(text).byteLength;
  if (
    sizeOf(range) > MAX_TITLE_BYTES ||
    sizeOf(target.base) > MAX_NAME_BYTES ||
    sizeOf(target.head) > MAX_NAME_BYTES
  ) {
    return { files: diffs as unknown[], projectPath };
  }

  const shown = (commits as unknown[])
    .toReversed()
    .flatMap((entry): ExtensionComparisonCommitDescriptor[] => {
      const title = readBoundedString(entry, 'title', MAX_TITLE_BYTES);
      const author = readBoundedString(entry, 'author_name', MAX_NAME_BYTES);
      const authoredAt = readBoundedString(
        entry,
        'authored_date',
        MAX_DATE_BYTES,
      );
      const revision = readBoundedString(entry, 'id', MAX_NAME_BYTES);
      const displayRevision = readBoundedString(
        entry,
        'short_id',
        MAX_REVISION_BYTES,
      );
      return title === undefined ||
        author === undefined ||
        authoredAt === undefined ||
        Number.isNaN(Date.parse(authoredAt)) ||
        revision === undefined ||
        !FULL_SHA.test(revision) ||
        displayRevision === undefined
        ? []
        : [{ title, author, authoredAt, revision, displayRevision }];
    })
    .slice(0, MAX_HEADER_COMMITS);
  const describe = (
    listed: readonly ExtensionComparisonCommitDescriptor[],
  ): ExtensionComparisonReviewDescriptor => ({
    kind: 'comparison',
    provider: 'GitLab',
    title: range,
    url,
    base: target.base,
    head: target.head,
    commitCount: commits.length,
    commits: listed,
  });
  while (shown.length > 0 && !fitsReviewHeader(describe(shown))) {
    shown.pop();
  }
  const review = describe(shown);
  return fitsReviewHeader(review)
    ? { files: diffs as unknown[], review, projectPath }
    : { files: diffs as unknown[], projectPath };
};

export default parseComparison;
