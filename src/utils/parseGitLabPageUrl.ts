import parseGitLabProject from './parseGitLabProject.ts';

/** The page kinds whose links GitLab sends in its metadata. */
type GitLabPageSection = 'merge_requests' | 'commit';

/** The project path and the page reference of one gitlab.com page link. */
interface GitLabPage {
  readonly path: string;
  readonly ref: string;
}

/**
 * Reads a gitlab.com page link from GitLab's own metadata, such as the
 * `web_url` of a merge request or a commit. Only a plain HTTPS link on
 * gitlab.com, to a valid project path, counts.
 *
 * @param pageUrl - The link from GitLab.
 * @param section - The page kind after `/-/`.
 * @returns The project path and the reference, or null for any other link.
 */
const parseGitLabPageUrl = (
  pageUrl: string,
  section: GitLabPageSection,
): GitLabPage | null => {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'gitlab.com' ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return null;
  }
  const marker = `/-/${section}/`;
  const index = url.pathname.indexOf(marker);
  const ref = url.pathname.slice(index + marker.length);
  if (index <= 0 || !ref || ref.includes('/')) {
    return null;
  }
  try {
    const project = parseGitLabProject(url.pathname.slice(1, index));
    return project.kind === 'path' ? { path: project.path, ref } : null;
  } catch {
    return null;
  }
};

export default parseGitLabPageUrl;
