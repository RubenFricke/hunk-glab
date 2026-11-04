import {
  type ExtensionCommitReviewDescriptor,
  HunkExtensionUserError,
} from 'hunkdiff/extension';

import fitsReviewHeader from './fitsReviewHeader.ts';
import parseGitLabPageUrl from './parseGitLabPageUrl.ts';
import type { GitLabProject } from './parseGitLabProject.ts';
import readBoundedString from './readBoundedString.ts';

const FULL_SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const SHORT_SHA = /^[0-9a-f]{7,40}$/;
const MAX_TITLE_BYTES = 2 * 1024;
const MAX_URL_BYTES = 2 * 1024;
const MAX_NAME_BYTES = 512;
const MAX_DATE_BYTES = 128;

/** One commit as the user named it. */
interface CommitTarget {
  readonly project: GitLabProject;
  /** The SHA the user gave, 7 to 40 hexadecimal characters in lowercase. */
  readonly sha: string;
}

/** The review header of a commit and the path of its project. */
interface CommitMetadata {
  /** Left out when even its required fields do not fit Hunk's limit. */
  readonly review?: ExtensionCommitReviewDescriptor;
  /** From the page link, so a project given by id still has a path. */
  readonly projectPath: string;
  /** The full SHA, also when the header is left out. */
  readonly revision: string;
}

/**
 * Turns the GitLab metadata of a commit into the header Hunk shows above the
 * review. Every field is checked, because it reaches the terminal. Hunk refuses
 * the whole review for a header over its total limit, so the link is dropped
 * first, and the header left out when it still does not fit.
 *
 * @param value - The parsed JSON from GitLab.
 * @param target - The commit that was asked for.
 * @returns The review descriptor, the project path and the full SHA.
 * @throws {HunkExtensionUserError} When a field is missing or malformed, or the
 *   page link is not the commit's.
 */
const parseCommitMetadata = (
  value: unknown,
  target: CommitTarget,
): CommitMetadata => {
  const malformed = (): HunkExtensionUserError =>
    new HunkExtensionUserError('GitLab returned malformed commit metadata.');
  const read = (field: string, maxBytes: number): string => {
    const text = readBoundedString(value, field, maxBytes);
    if (text === undefined) {
      throw malformed();
    }
    return text;
  };

  const revision = read('id', MAX_NAME_BYTES);
  const displayRevision = read('short_id', MAX_NAME_BYTES);
  const title = read('title', MAX_TITLE_BYTES);
  const author = read('author_name', MAX_NAME_BYTES);
  const authoredAt = read('authored_date', MAX_DATE_BYTES);
  const url = read('web_url', MAX_URL_BYTES);
  const page = parseGitLabPageUrl(url, 'commit');
  if (
    !FULL_SHA.test(revision) ||
    !revision.startsWith(target.sha) ||
    !SHORT_SHA.test(displayRevision) ||
    Number.isNaN(Date.parse(authoredAt)) ||
    page?.ref !== revision ||
    (target.project.kind === 'path' &&
      page.path.toLowerCase() !== target.project.path.toLowerCase())
  ) {
    throw malformed();
  }

  const projectPath =
    target.project.kind === 'path' ? target.project.path : page.path;
  const withoutUrl: ExtensionCommitReviewDescriptor = {
    kind: 'commit',
    provider: 'GitLab',
    title,
    revision,
    displayRevision,
    author,
    authoredAt,
  };
  const review = [{ ...withoutUrl, url }, withoutUrl].find(fitsReviewHeader);
  return review === undefined
    ? { projectPath, revision }
    : { projectPath, revision, review };
};

export default parseCommitMetadata;
