# hunk-glab

Review GitLab merge requests in [Hunk](https://hunk.dev) from the command line, the way `hunk gh` reviews GitHub pull requests.

Work in progress: `hunk glab mr` opens a merge request on gitlab.com. Commits and comparisons come next.

```bash
hunk glab mr                                  # the open merge request of the current branch
hunk glab mr 123                              # the project from the origin of this checkout
hunk glab mr 123 --repo group/sub/project     # or name the project, by path or numeric id
hunk glab mr 'group/project!123'              # GitLab's own reference; quote the !
hunk glab mr https://gitlab.com/group/project/-/merge_requests/123
GITLAB_TOKEN=glpat-… hunk glab mr 123         # private projects need a token with read_api
hunk glab mr 123 -- --mode unified            # options after -- go to hunk patch
```

## Development

```bash
bun install
bun run check                                     # typecheck, lint, format, knip, tests
hunk --extension /path/to/hunk-glab glab --help   # try a checkout without installing
```

Hunk names an extension after its folder, so keep a checkout in a folder called `hunk-glab`.
