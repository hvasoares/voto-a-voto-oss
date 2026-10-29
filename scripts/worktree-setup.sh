#!/usr/bin/env bash
# scripts/worktree-setup.sh — one command prepares a fresh worktree (ticket #126): node checked
# against web/package.json engines, `web` dependencies installed into the worktree itself (never a
# shared or symlinked node_modules), the Playwright chromium browser ready, the checkout's e2e port
# printed, and a smoke run of one unit file plus one fixture spec. Run it from INSIDE the new
# worktree (created OUTSIDE the main checkout's tree — a nested worktree can silently resolve the
# parent's node_modules):
#
#   git worktree add ../voto-a-voto-wt-x my-branch
#   cd ../voto-a-voto-wt-x
#   make worktree-setup            # or: bash scripts/worktree-setup.sh
#
# Every step prints [name] ... and finishes with its elapsed seconds; on failure the step prints
# [name] FAILED: <reason> and the script exits non-zero — no step continues after a failure.
# Re-running resumes: finished steps print "skipped (already done)", the failed one runs again and
# the smoke always runs. The script writes no file (no .env, no port file — the e2e port derives
# from the checkout path, #124) and never overwrites anything of yours.

set -uo pipefail

step=""
t0=0

now() { date +%s; }
elapsed() { echo $(( $(now) - t0 )); }
say() { printf '[%s] %s\n' "$step" "$*"; }
begin() { step=$1; t0=$(now); say "$2"; }
done_step() { say "done ($(elapsed)s)"; }
skipped() { say "skipped (already done) ($(elapsed)s)"; }
die() { say "FAILED: $*" >&2; exit 1; }

# 1. node must satisfy web/package.json engines.node (>=22.12); .nvmrc pins the CI version.
check_node() {
  begin check_node "node satisfies web/package.json engines.node"
  command -v node >/dev/null 2>&1 ||
    die "node not found on PATH; web/package.json requires it and .nvmrc pins $(cat .nvmrc 2>/dev/null || echo 22.23.4)"
  local engines min found fmaj fmin fpat mmaj mmin mpat
  engines=$(sed -n 's/.*"node"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' web/package.json | head -n 1)
  [[ $engines == '>='* ]] || die "cannot parse engines.node '$engines' in web/package.json (expected '>=X.Y')"
  min=${engines#>=}
  found=$(node --version); found=${found#v}
  IFS=. read -r fmaj fmin fpat <<<"$found"
  IFS=. read -r mmaj mmin mpat <<<"$min"
  : "${fpat:=0}" "${mpat:=0}"
  if (( 10#$fmaj > 10#$mmaj \
     || (10#$fmaj == 10#$mmaj && 10#$fmin > 10#$mmin) \
     || (10#$fmaj == 10#$mmaj && 10#$fmin == 10#$mmin && 10#$fpat >= 10#$mpat) )); then
    say "node $found satisfies $engines"
    done_step
  else
    die "node $found found, web/package.json requires $engines — .nvmrc pins $(cat .nvmrc 2>/dev/null || echo 22.23.4)"
  fi
}

# 2. per-worktree `npm ci` against the lockfile — shared mutable node_modules between checkouts is
# how agents poison one another. Skipped when the lockfile stamp is newer than the lockfile and
# vitest resolves from inside this worktree.
install_deps() {
  begin install_deps "npm ci --prefix web (lockfile, per-worktree)"
  if [[ -d web/node_modules/vitest \
     && -f web/node_modules/.package-lock.json \
     && web/node_modules/.package-lock.json -nt web/package-lock.json ]]; then
    skipped; return 0
  fi
  npm ci --prefix web || die "npm ci --prefix web exited $?"
  [[ -d web/node_modules/vitest ]] ||
    die "web/node_modules/vitest is missing inside this worktree after npm ci"
  done_step
}

# 3. chromium for Playwright. Browsers live in the shared per-user cache (read-only sharing), so a
# second worktree costs seconds — skipped when every location `playwright install --dry-run` lists
# already exists.
install_browser() {
  begin install_browser "playwright install chromium (shared per-user cache)"
  local locations missing=0 line
  locations=$(cd web && npx playwright install chromium --dry-run 2>/dev/null |
    awk '/Install location:/ { sub(/.*Install location:[ \t]*/, ""); print }')
  if [[ -n $locations ]]; then
    while IFS= read -r line; do
      [[ -d $line ]] || { missing=1; break; }
    done <<<"$locations"
    (( missing == 0 )) && { skipped; return 0; }
  fi
  (cd web && npx playwright install chromium) || die "playwright install chromium exited $?"
  done_step
}

# 4. one source of truth: web/scripts/e2e-port.ts (#124). Nothing is written; E2E_PORT pins if wanted.
show_port() {
  begin show_port "the checkout's e2e port (derived; no file, no env written)"
  local port
  port=$(npm --prefix web run --silent e2e:port) || die "npm run e2e:port exited $?"
  [[ $port =~ ^[0-9]+$ ]] || die "unexpected output from npm run e2e:port: '$port'"
  say "e2e port for this checkout: $port"
  done_step
}

# 5. smoke: one fast unit file and one named fixture spec, each timed; the spec triggers the
# fixture build through Playwright's webServer, so a pass here means the whole loop works.
smoke() {
  begin smoke "vitest src/theme.test.ts + playwright home.spec.ts --project=phone"
  local log since rc=0
  log=$(mktemp "${TMPDIR:-/tmp}/worktree-setup-smoke.XXXXXX")

  since=$(now)
  if (cd web && npx vitest run src/theme.test.ts) >"$log" 2>&1; then
    say "PASS unit src/theme.test.ts ($(( $(now) - since ))s)"
  else
    rc=1; say "FAIL unit src/theme.test.ts ($(( $(now) - since ))s)"; tail -n 30 "$log" >&2
  fi

  if (( rc == 0 )); then
    since=$(now)
    if (cd web && npx playwright test home.spec.ts --project=phone) >"$log" 2>&1; then
      say "PASS e2e  e2e/home.spec.ts --project=phone ($(( $(now) - since ))s)"
    else
      rc=1; say "FAIL e2e  e2e/home.spec.ts --project=phone ($(( $(now) - since ))s)"; tail -n 60 "$log" >&2
    fi
  fi

  rm -f "$log"
  (( rc == 0 )) || die "smoke failed (above)"
  done_step
}

main() {
  [[ -f web/package.json ]] ||
    { echo "[setup] FAILED: web/package.json not found — run from the worktree's repo root" >&2; exit 1; }
  local start=$SECONDS
  check_node
  install_deps
  install_browser
  show_port
  smoke
  printf '[setup] worktree ready in %ss\n' $(( SECONDS - start ))
}

main "$@"
