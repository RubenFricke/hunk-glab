import parseGitLabProject, {
  type GitLabProject,
} from './parseGitLabProject.ts';

/** The scp-like form Git uses for SSH: `git@gitlab.com:group/project.git`. */
const SCP_REMOTE = /^(?:[^@\s]+@)?gitlab\.com:([^\s]+)$/i;
const REMOTE_PROTOCOLS = new Set(['https:', 'ssh:', 'git:']);

/**
 * Reads the gitlab.com project a Git remote points at.
 *
 * @param remote - The remote URL, as `git remote get-url` prints it.
 * @returns The project, or null when the remote is not a gitlab.com project.
 */
const parseGitLabRemote = (remote: string): GitLabProject | null => {
  let path = SCP_REMOTE.exec(remote)?.[1];
  if (path === undefined) {
    let url: URL;
    try {
      url = new URL(remote);
    } catch {
      return null;
    }
    if (
      !REMOTE_PROTOCOLS.has(url.protocol) ||
      url.hostname !== 'gitlab.com' ||
      url.port ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    path = url.pathname.replace(/^\//, '');
  }

  try {
    return parseGitLabProject(path.replace(/\.git$/i, ''));
  } catch {
    return null;
  }
};

export default parseGitLabRemote;
