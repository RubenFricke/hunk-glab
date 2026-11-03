import { HunkExtensionUserError } from 'hunkdiff/extension';

import buildCancelledError from './utils/buildCancelledError.ts';
import readBoundedBody from './utils/readBoundedBody.ts';

/** The only place a request goes, so a token never reaches another host. */
const GITLAB_API_ORIGIN = 'https://gitlab.com/api/v4';
const USER_AGENT = 'hunk-glab';

export type GitLabFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface FetchGitLabOptions {
  /** The API path after `/api/v4/`, already encoded. */
  readonly apiPath: string;
  readonly accept: string;
  /** What is requested, for messages: `group/project!123`. */
  readonly name: string;
  readonly maxBytes: number;
  readonly tooLargeMessage: string;
  readonly emptyMessage: string;
  readonly signal: AbortSignal;
  readonly fetch: GitLabFetch;
}

/**
 * Requests one GitLab API path and reads its body up to a byte limit. Every
 * failure becomes a fixed message without server or transport details.
 *
 * @param options - The path, what it names, the limits and the transport.
 * @returns The body.
 * @throws {HunkExtensionUserError} When the request fails, redirects, returns
 *   no success, is too large or empty, or is cancelled.
 */
const fetchGitLab = async ({
  apiPath,
  accept,
  name,
  maxBytes,
  tooLargeMessage,
  emptyMessage,
  signal,
  fetch,
}: FetchGitLabOptions): Promise<Uint8Array> => {
  const unreachable = (): HunkExtensionUserError =>
    signal.aborted
      ? buildCancelledError()
      : new HunkExtensionUserError(
          'GitLab could not be reached while loading the merge request.',
          { suggestions: ['Check network access and retry.'] },
        );

  let response: Response;
  try {
    response = await fetch(`${GITLAB_API_ORIGIN}/${apiPath}`, {
      headers: new Headers({ Accept: accept, 'User-Agent': USER_AGENT }),
      redirect: 'manual',
      signal,
    });
  } catch {
    throw unreachable();
  }

  if (
    response.type === 'opaqueredirect' ||
    (response.status >= 300 && response.status < 400)
  ) {
    throw new HunkExtensionUserError(
      `GitLab redirected the request for ${name}; refusing to forward credentials.`,
    );
  }
  if (!response.ok) {
    throw new HunkExtensionUserError(
      `GitLab returned HTTP ${String(response.status)} for ${name}.`,
    );
  }

  try {
    return await readBoundedBody({
      response,
      signal,
      maxBytes,
      tooLargeMessage,
      emptyMessage,
    });
  } catch (error) {
    if (error instanceof HunkExtensionUserError) {
      throw error;
    }
    throw unreachable();
  }
};

export default fetchGitLab;
