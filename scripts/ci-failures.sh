#!/usr/bin/env bash
# `make ci-failures [REMOTE=origin]`: what failed in the latest `ci` run of a remote's main, and nothing else.
# The failing jobs and steps, then the first lines of each failure's error. Read-only; needs `gh`.
set -uo pipefail

remote=${1:-origin}
command -v gh >/dev/null 2>&1 || { echo "gh is required"; exit 2; }
repo=$(git remote get-url "$remote" | sed -E 's#^(git@github.com:|https://github.com/)##; s#\.git$##')
run=$(gh run list --repo "$repo" --workflow ci --branch main --limit 1 --json databaseId,status,conclusion,headSha \
  --jq '.[0] | "\(.databaseId) \(.status) \(.conclusion) \(.headSha[0:7])"')
read -r id status conclusion sha <<<"$run"
echo "$repo ci $sha: $status $conclusion"
[[ $conclusion == failure ]] || exit 0

gh run view "$id" --repo "$repo" --json jobs \
  --jq '.jobs[] | select(.conclusion=="failure") | "  \(.name): " + ([.steps[] | select(.conclusion=="failure") | .name] | join(", "))'
# Only the lines that name a failure; the full log is `gh run view <id> --log-failed`.
gh run view "$id" --repo "$repo" --log-failed 2>/dev/null |
  awk -F'\t' '{print $NF}' | perl -pe 's/(?:\e|\^\[)\[[0-9;]*m//g; s/^[0-9TZ:.-]+ //' |
  grep -E '(✘|FAIL |AssertionError|Error:|##\[error\])' | awk '!seen[$0]++' | head -20
