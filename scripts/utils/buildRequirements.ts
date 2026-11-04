import type { Manifest } from './parseManifest.ts';

interface BuildRequirementsOptions {
  readonly repository: string;
  readonly current: Pick<Manifest, 'hunkVersion' | 'apiVersion'>;
  /** The release before this one, with the Hunk it needed. */
  readonly previous: {
    readonly tag: string;
    readonly hunkVersion: string;
  } | null;
}

/**
 * The top of the release notes. Release notes are never edited afterwards, so
 * they state only what stays true: the oldest Hunk this release needs. A newer
 * Hunk is covered by the strategy in the README and the daily test.
 */
const buildRequirements = ({
  repository,
  current,
  previous,
}: BuildRequirementsOptions): string => {
  const isNewer = (version: string, than: string): boolean => {
    const a = version.split('.').map(Number);
    const b = than.split('.').map(Number);
    const index = a.findIndex((part, i) => part !== b[i]);
    return index !== -1 && (a[index] ?? 0) > (b[index] ?? 0);
  };

  const lines = [
    '## Requirements',
    '',
    `Hunk ${current.hunkVersion} or newer (extension API ${String(current.apiVersion)}).`,
  ];
  if (previous && isNewer(current.hunkVersion, previous.hunkVersion)) {
    lines.push(
      '',
      `Raises the minimum from Hunk ${previous.hunkVersion}. On an older Hunk, stay on ${previous.tag}: \`hunk extension install ${repository}@${previous.tag}\`.`,
    );
  }
  return `${lines.join('\n')}\n`;
};

export default buildRequirements;
