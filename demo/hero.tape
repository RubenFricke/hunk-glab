# The README demo. Run it through demo/record.sh, which makes an isolated Hunk
# config in HUNK_GLAB_DEMO, points HUNK_GLAB_ROOT at this checkout and checks
# the result. It reads public data from gitlab.com, so it needs the network.
Output demo/out/hero.gif
Require hunk

Set Shell bash
Set FontSize 16
Set Width 940
Set Height 620
Set Padding 12
Set Framerate 12
Set TypingSpeed 40ms

Env HUNK_DISABLE_UPDATE_NOTICE "1"
Env HUNK_MCP_DISABLE "1"

Hide
Type `export XDG_CONFIG_HOME="$HUNK_GLAB_DEMO/config" XDG_STATE_HOME="$HUNK_GLAB_DEMO/state"` Enter
# The checkout loads as an extension without showing --extension on screen.
Type `hunk() { command hunk --extension "$HUNK_GLAB_ROOT" "$@"; }` Enter
Type `export PS1='$ ' && cd "$HUNK_GLAB_DEMO" && clear` Enter
Show

# A merge request, by the URL from the browser
Sleep 600ms
Type "hunk glab mr https://gitlab.com/gitlab-org/cli/-/merge_requests/4258"
Sleep 500ms
Enter
Wait+Screen@20s /MERGED · !4258/
Sleep 2000ms
Type "j"
Sleep 500ms
Type "j"
Sleep 500ms
Type "j"
Sleep 500ms
Type "j"
Sleep 1500ms
Type "q"
Wait+Line@10s /^\$ *$/

# A commit, by GitLab's project@sha shorthand
Sleep 400ms
Type "hunk glab commit gitlab-org/cli@8ff30e46"
Sleep 500ms
Enter
Wait+Screen@20s /8ff30e46/
Sleep 3000ms
Type "q"
Sleep 600ms
