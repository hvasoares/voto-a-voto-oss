#!/usr/bin/env bash
# scripts/worktree-setup.test.sh — end-to-end check of worktree-setup.sh (ticket #126): create a
# real worktree OUTSIDE this checkout (a nested one could silently resolve the parent's
# node_modules), run the setup in it, assert exit 0 and node_modules/vitest inside the worktree,
# run it a second time and assert the skip lines, then remove the worktree whatever happened.
# Local: bash scripts/worktree-setup.test.sh. CI: .github/workflows/worktree-setup.yml.

set -uo pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/.." && pwd)
tmp=$(mktemp -d "${TMPDIR:-/tmp}/worktree-setup-test.XXXXXX")
wt="$tmp/wt"

cleanup() {
  git -C "$repo" worktree remove --force "$wt" >/dev/null 2>&1
  rm -rf "$tmp"
}
trap cleanup EXIT

fail() { echo "[test] FAILED: $*" >&2; exit 1; }

echo "[test] fresh worktree at $wt (HEAD, detached)"
git -C "$repo" worktree add --detach "$wt" HEAD >/dev/null || fail "git worktree add"

echo "[test] first run — fresh worktree"
( cd "$wt" && bash "$here/worktree-setup.sh" ) || fail "first run of worktree-setup.sh"
[[ -d "$wt/web/node_modules/vitest" ]] || fail "web/node_modules/vitest missing inside the new worktree"

echo "[test] second run — idempotent"
out=$( cd "$wt" && bash "$here/worktree-setup.sh" ) || fail "second run of worktree-setup.sh"
grep -qF '[install_deps] skipped (already done)'    <<<"$out" || fail "second run did not skip install_deps"
grep -qF '[install_browser] skipped (already done)' <<<"$out" || fail "second run did not skip install_browser"
grep -qF 'e2e port for this checkout:'              <<<"$out" || fail "second run did not print the e2e port"

echo "[test] OK — fresh run ready, re-run skipped and re-smoked, worktree removed"
