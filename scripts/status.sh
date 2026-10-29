#!/usr/bin/env bash
# `make status`: where the repo stands, in one block, instead of a dozen commands.
# Branch and tip, ahead/behind against every remote, the latest CI and deploy run of each remote on its main, the
# newest tag, and the worktrees other agents hold. Read-only; needs `gh` for the run lines and skips them without it.
set -uo pipefail

branch=$(git rev-parse --abbrev-ref HEAD)
echo "branch   $branch  $(git log -1 --format='%h %s' | cut -c1-80)"
dirty=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')
echo "dirty    $dirty tracked file(s) changed"
echo "tag      $(git describe --tags --abbrev=0 2>/dev/null || echo none)"

for remote in $(git remote); do
  git fetch --quiet "$remote" 2>/dev/null
  if git rev-parse --verify --quiet "$remote/main" >/dev/null; then
    read -r ahead behind < <(git rev-list --left-right --count "main...$remote/main" 2>/dev/null || echo "? ?")
    echo "remote   $remote: main is $ahead ahead, $behind behind"
  fi
  if command -v gh >/dev/null 2>&1; then
    repo=$(git remote get-url "$remote" | sed -E 's#^(git@github.com:|https://github.com/)##; s#\.git$##')
    gh run list --repo "$repo" --branch main --limit 3 --json workflowName,status,conclusion,headSha \
      --jq '.[] | "         \(.workflowName) \(.status) \(.conclusion) \(.headSha[0:7])"' 2>/dev/null
  fi
done

others=$(git worktree list | grep -c '/\.claude/worktrees/' || true)
echo "worktrees $others agent worktree(s)"
