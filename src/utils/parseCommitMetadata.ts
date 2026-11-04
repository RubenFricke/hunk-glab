import {
  type ExtensionCommitReviewDescriptor,
  HunkExtensionUserError,
} from 'hunkdiff/extension';

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
  readonly review: ExtensionCommitReviewDescriptor;
  /** From the page link, so a project given by id still has a path. */
  readonly projectPath: string;
}

/**
 * Turns the GitLab metadata of a commit into the header Hunk shows above the
 * review. Every field is checked, because it reaches the terminal.
 *
 * @param value - The parsed JSON from GitLab.
 * @param target - The commit that was asked for.
 * @returns The review descriptor and the project path.
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

  return {
    projectPath:
      target.project.kind === 'path' ? target.project.path : page.path,
    review: {
      kind: 'commit',
      provider: 'GitLab',
      title,
      url,
      revision,
      displayRevision,
      author,
      authoredAt,
    },
  };
};

export default parseCommitMetadata;
