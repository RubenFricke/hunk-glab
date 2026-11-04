export const RELEASE_BUMPS = ['patch', 'minor', 'major'] as const;
export type ReleaseBump = (typeof RELEASE_BUMPS)[number];

interface ReleasePlan {
  readonly version: string;
  readonly tag: string;
  readonly previousTag: string | null;
}

interface PlanReleaseOptions {
  readonly bump: ReleaseBump;
  readonly packageVersion: string;
  readonly tags: readonly string[];
}

type Version = readonly [number, number, number];

const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/**
 * The tags are the record of what was released, and package.json on main
 * mirrors the latest of them. When the two differ, a release was made by hand
 * and the next version is anyone's guess, so the plan refuses.
 */
const planRelease = ({
  bump,
  packageVersion,
  tags,
}: PlanReleaseOptions): ReleasePlan => {
  const format = (version: Version): string => version.join('.');
  const raise = ([major, minor, patch]: Version): Version => {
    switch (bump) {
      case 'major':
        return [major + 1, 0, 0];
      case 'minor':
        return [major, minor + 1, 0];
      case 'patch':
        return [major, minor, patch + 1];
    }
  };

  const released = tags
    .map((tag) => RELEASE_TAG.exec(tag))
    .filter((match) => match !== null)
    .map(([, major = '', minor = '', patch = '']): Version => [
      Number(major),
      Number(minor),
      Number(patch),
    ])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const latest = released.at(-1) ?? [0, 0, 0];
  const latestVersion = format(latest);
  if (latestVersion !== packageVersion) {
    throw new Error(
      `package.json says ${packageVersion}, but the latest release tag says ${latestVersion}.`,
    );
  }

  const version = format(raise(latest));
  return {
    version,
    tag: `v${version}`,
    previousTag: released.length > 0 ? `v${latestVersion}` : null,
  };
};

export default planRelease;
