# hunk-glab

Review GitLab merge requests in [Hunk](https://hunk.dev) from the command line, the way `hunk gh` reviews GitHub pull requests.

Work in progress: `hunk glab mr` opens one merge request on gitlab.com. URLs, the merge request of the current branch, commits and comparisons come next.

```bash
hunk glab mr 123                              # the project from the origin of this checkout
hunk glab mr 123 --repo group/sub/project     # or name the project, by path or numeric id
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
