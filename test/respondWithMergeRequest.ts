interface MergeRequestFixture {
  readonly path: string;
  readonly iid: number;
  readonly diff: string;
}

/**
 * Answers like gitlab.com for one merge request: the diff at `raw_diffs`, the
 * metadata at the merge request itself.
 */
const respondWithMergeRequest =
  ({ path, iid, diff }: MergeRequestFixture) =>
  (url: string): Response =>
    url.endsWith('/raw_diffs')
      ? new Response(diff)
      : Response.json({
          title: `Merge request ${String(iid)}`,
          web_url: `https://gitlab.com/${path}/-/merge_requests/${String(iid)}`,
          author: { username: 'ruben' },
          target_branch: 'main',
          source_branch: 'feature',
          state: 'opened',
          draft: true,
        });

export default respondWithMergeRequest;
