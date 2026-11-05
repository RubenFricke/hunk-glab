# hunk-glab

Review GitLab merge requests, commits and comparisons in [Hunk](https://hunk.dev) from the command line, the way `hunk gh` reviews GitHub pull requests.

<img alt="hunk glab mr opens a GitLab merge request from its URL in Hunk, with its title, state, author and branches above the review. hunk glab commit then opens a commit from the group/project@sha shorthand, with its title, author, date and short SHA." src="demo/hero.gif" width="940">

## Install

```bash
hunk extension install RubenFricke/hunk-glab
```

Requires Hunk 0.24.0 or newer (extension API 31). Releases are tagged, so you can pin one: `hunk extension install RubenFricke/hunk-glab@v0.1.0`. The glab CLI is not needed.

## Use

Open the single open merge request of the current branch. The project is inferred from the checkout's gitlab.com `origin`:

```bash
hunk glab mr
```

Pass a number, GitLab's own reference, or a URL when you want a specific merge request:

```bash
hunk glab mr 123
hunk glab mr 123 --repo group/subgroup/project
hunk glab mr 123 --repo 34675721
hunk glab mr 'group/project!123'
hunk glab mr https://gitlab.com/group/project/-/merge_requests/123
```

Quote the forms with `!`, because shells expand `!` from their history. `--repo` takes a project path with its subgroups, or the numeric project id.

Review a commit by its 7–40 character hexadecimal SHA, a `project@sha` shorthand, or its URL:

```bash
hunk glab commit a1b2c3d
hunk glab commit a1b2c3d --repo group/project
hunk glab commit group/project@a1b2c3d
hunk glab commit https://gitlab.com/group/project/-/commit/a1b2c3d
```

Compare branches, tags, or commits with an explicit three-dot range. Like a merge request, the review shows the changes of the head since it left the base:

```bash
hunk glab compare main...feature
hunk glab compare v1.0.0...v1.1.0 --repo group/project
```

Pass Hunk patch options after `--` for any command:

```bash
hunk glab mr 123 -- --mode unified
```

Run `hunk glab --help` or `hunk glab mr --help` for command help.

## Authentication

Public projects work anonymously within GitLab's API rate limits. For private projects or higher limits, set `GITLAB_TOKEN` or, when it is absent, `GITLAB_ACCESS_TOKEN`, to a token with the `read_api` scope.

hunk-glab sends credentials only to the fixed `https://gitlab.com/api/v4` endpoint and refuses redirects. GitLab Self-Managed is not currently supported.

## How it works

hunk-glab fetches the merge request, commit, or comparison directly from GitLab's REST API, writes a temporary patch, and delegates to Hunk's built-in `patch` command. Above the review it shows a header: the title, state, author and branches of a merge request, the title, author and date of a commit, or the commits of a comparison.

- **A merge request** comes from GitLab's raw diff, the patch of the merge request as Git writes it.
- **A commit or a comparison** has no such patch in GitLab's API, only the changes per file, so hunk-glab rebuilds the patch from them, with the paths, modes, renames and binary files `git diff` would show.
- **Nothing is shown incomplete.** GitLab leaves out the changes of a file it finds too large, and stops a commit diff at 1,000 files. hunk-glab then refuses the review and names the local command that shows the full diff, such as `hunk diff main...feature` or `hunk show a1b2c3d` in a checkout.

Fetched diffs are limited to 64 MiB. On POSIX systems, temporary directories use mode `0700` and patches use mode `0600`; Windows inherits the ACL of the system temporary directory. Patches remain available for review reloads and are removed when the extension shuts down.

## What it reads and writes

hunk-glab only reads from GitLab: every request is a `GET` to `https://gitlab.com/api/v4`. Without `--repo` or a locator that names the project, it asks Git for the checkout's `origin`, and for `hunk glab mr` without a number also for the branch, `HEAD` and its upstream. It writes one temporary patch per review, and nothing else: no settings, no cache, no files in your checkout.

## Compatibility

hunk-glab follows the newest Hunk release. CI tests every pull request against the oldest Hunk that hunk-glab supports and against the newest Hunk release, and checks the newest again every day. When a new Hunk release breaks something, the fix comes in a new hunk-glab release.

Each release lists the Hunk it needs. When a release raises that minimum, its notes say which earlier release still works with an older Hunk. If your Hunk is too old, Hunk itself tells you at startup.

## Known limitations

- **gitlab.com only.** GitLab Self-Managed and GitLab Dedicated are not supported yet.
- **Comparisons with larger files are refused.** GitLab's comparison API leaves out the changes of every file with a diff of about 20 KB or more, and offers no way to get them, so such a comparison is refused with a pointer to `hunk diff base...head`. Commits are affected only by files above about 200 KB.
- **A crash can leave a patch behind.** The temporary patch is removed when Hunk shuts down, but not when the process is killed.

## Development

```bash
bun install
bun run check                                     # typecheck, lint, format, knip, tests
hunk --extension /path/to/hunk-glab glab --help   # try a checkout without installing
./demo/record.sh                                  # re-record the README demo (needs vhs and gitlab.com)
```

hunk-glab is based on the design and behaviour of [hunk-gh](https://github.com/modem-dev/hunk-gh) (MIT), the GitHub extension that Hunk now bundles as `hunk gh`.
