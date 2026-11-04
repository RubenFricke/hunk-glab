import type { ExtensionChangeRequestReviewDescriptor } from 'hunkdiff/extension';

import fetchGitLab, {
  type GitLabEnv,
  type GitLabFetch,
} from './fetchGitLab.ts';
import describeMergeRequest, {
  type MergeRequestTarget,
} from './utils/describeMergeRequest.ts';
import encodeProject from './utils/encodeProject.ts';
import parseJsonBody from './utils/parseJsonBody.ts';
import parseMergeRequestMetadata from './utils/parseMergeRequestMetadata.ts';

const MAX_METADATA_BYTES = 1024 * 1024;

interface FetchMergeRequestMetadataOptions {
  readonly target: MergeRequestTarget;
  readonly signal: AbortSignal;
  readonly fetch: GitLabFetch;
  readonly env: GitLabEnv;
}

/**
 * Fetches the metadata of a merge request for the header above the review.
 *
 * @param options - The merge request, the run's signal and the transport.
 * @returns The review descriptor.
 * @throws {HunkExtensionUserError} When the request fails or the metadata is
 *   too large, empty or malformed.
 */
const fetchMergeRequestMetadata = async ({
  target,
  signal,
  fetch,
  env,
}: FetchMergeRequestMetadataOptions): Promise<ExtensionChangeRequestReviewDescriptor> => {
  const bytes = await fetchGitLab({
    apiPath: `projects/${encodeProject(target.project)}/merge_requests/${String(target.iid)}`,
    accept: 'application/json',
    name: describeMergeRequest(target),
    maxBytes: MAX_METADATA_BYTES,
    tooLargeMessage:
      'GitLab merge-request metadata exceeds the 1 MiB safety limit.',
    emptyMessage: 'GitLab returned empty merge-request metadata.',
    signal,
    fetch,
    env,
  });

  return parseMergeRequestMetadata(
    parseJsonBody(bytes, 'GitLab returned malformed merge-request metadata.'),
    target,
  );
};

export default fetchMergeRequestMetadata;
