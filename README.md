# hunk-glab

Review GitLab merge requests in [Hunk](https://hunk.dev) from the command line, the way `hunk gh` reviews GitHub pull requests.

Work in progress: `hunk glab` only prints its help so far.

## Development

```bash
bun install
bun run check                                     # typecheck, lint, format, knip, tests
hunk --extension /path/to/hunk-glab glab --help   # try a checkout without installing
```

Hunk names an extension after its folder, so keep a checkout in a folder called `hunk-glab`.
