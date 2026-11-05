import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

import buildRequirements from './utils/buildRequirements.ts';
import parseManifest from './utils/parseManifest.ts';
import planRelease, {
  RELEASE_BUMPS,
  type ReleaseBump,
} from './utils/planRelease.ts';

const USAGE =
  'Usage: bun run scripts/release.ts --bump <patch|minor|major> [--dry-run] [--notes <file>]';
const REPOSITORY = 'RubenFricke/hunk-glab';

/**
 * Plans the next release from the tags, writes the top of its notes, and writes
 * the version to package.json unless this is a dry run. The commit, the tag and
 * the GitHub release are the workflow's job, so that they stay visible in one
 * place.
 */
const release = (argv: readonly string[]): void => {
  const isBump = (value: string | undefined): value is ReleaseBump =>
    RELEASE_BUMPS.some((bump) => bump === value);
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const git = (...args: string[]): string =>
    execFileSync('git', args, { encoding: 'utf8' });

  const bump = valueOf('--bump');
  if (!isBump(bump)) {
    throw new Error(USAGE);
  }
  const isDryRun = argv.includes('--dry-run');
  const notesFile = valueOf('--notes');

  const tags = git('tag', '--list', 'v*')
    .split('\n')
    .filter((tag) => tag !== '');
  const manifestText = readFileSync('package.json', 'utf8');
  const manifest = parseManifest(manifestText);

  const plan = planRelease({
    bump,
    packageVersion: manifest.version,
    tags,
  });
  const after = plan.previousTag ? `after ${plan.previousTag}` : 'the first';
  console.log(`Next release: ${plan.tag} (${after}).`);

  const previousManifest = plan.previousTag
    ? parseManifest(git('show', `${plan.previousTag}:package.json`))
    : null;
  const requirements = buildRequirements({
    repository: REPOSITORY,
    current: manifest,
    previous:
      plan.previousTag && previousManifest
        ? { tag: plan.previousTag, hunkVersion: previousManifest.hunkVersion }
        : null,
  });
  console.log(`\n${requirements}`);
  if (notesFile !== undefined) {
    writeFileSync(notesFile, requirements);
  }

  const output = process.env.GITHUB_OUTPUT;
  if (output !== undefined) {
    appendFileSync(
      output,
      `version=${plan.version}\ntag=${plan.tag}\nprevious_tag=${plan.previousTag ?? ''}\n`,
    );
  }
  if (isDryRun) {
    console.log('Dry run: package.json stays as it is.');
    return;
  }

  /** A text replacement keeps the formatting of package.json intact. */
  const versionLine = `"version": "${manifest.version}"`;
  if (manifestText.split(versionLine).length !== 2) {
    throw new Error(`Expected exactly one ${versionLine} in package.json.`);
  }
  writeFileSync(
    'package.json',
    manifestText.replace(versionLine, `"version": "${plan.version}"`),
  );
  console.log(`package.json now says ${plan.version}.`);
};

try {
  release(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
