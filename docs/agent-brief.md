# Agent brief

The common brief for every agent that works on a ticket. A ticket brief says: "Follow `docs/agent-brief.md` at commit <sha> plus the scope below", and then gives only its own scope. The brief is read once, at start; an agent already running keeps the version it read and names that sha in its hand-back. Terms are in [the glossary](glossary.md).

Each rule is one line: the rule, why, and the file that enforces it where one exists. `Enforced by:` paths are checked to exist by `web/scripts/agent-brief-guard.test.ts`.

## Rules

- Do not push or tag. Releasing is a separate step done by the owner; an agent only commits on its own branch. Enforced by: review of the hand-back.
- Stage by path (`git add <file>`), never `git add -A` or `git add .`. A sweeping add has swept other agents' and generated files into commits. Enforced by: review of the commit.
- Prefix a command with `rtk proxy` when you need its raw output; the default filter shortens it. Enforced by: the launching session's command hook, not by a file here.
- Neutral wording: no sentence favours a candidate; all words come from the catalog. Enforced by: `web/src/lib/sentences/catalog.ts`
- Ballot-number order: two candidates are listed lower number first, whoever leads. Enforced by: `web/src/shared/ballot-order.test.ts`
- No invented entry points: a new route, entry point, framework or layout that the ticket does not name is a blocking question, not a decision. Enforced by: review of the diff.
- Build once: every ticket names its shared piece; use it or build it, and do not copy it. Enforced by: `web/src/shared/own-copies.test.ts`, `web/scripts/shard-plumbing-guard.test.ts`
- Footers and links: pages render the shared footer and link with `siteHref`. Enforced by: `web/src/shared/footer.test.ts`, `web/src/paths.ts`
- Page shells: a page draws its column with `PageMain`, its head through the layouts' `DocHead`, the fixture banner with `FixtureBanner`, the screen header with `AppHeader` and the seal with `Seal`; no page writes the 430 px column class itself. Enforced by: `web/src/shared/page-shell-guard.test.ts`
- E2E specs use the presets and wait on ready attributes, never fixed sleeps. Enforced by: `web/e2e/presets.ts`, `web/scripts/e2e-waits.ts`
- Real-data specs take figures from `web/e2e/real-data-oracle.ts` (counted from the build's data directory) and sentences from the catalog through `catalogText`; none types a catalog sentence or reads a data file. A deliberate golden value is listed with its reason. Enforced by: `web/e2e/real-data-guard.test.ts`
- Never kill a process by port: the port is yours, derived from the checkout, and `E2E_PORT` overrides it. Others' servers run on other ports. Enforced by: `web/scripts/e2e-port.ts`
- Set a worktree up with `make worktree-setup` from inside it. Enforced by: `scripts/worktree-setup.sh`
- Build experiments go to `dist` or a git-ignored folder, never to a tracked path. Enforced by: `.gitignore`
- Before hand-back run, from `web/`: `npm run typecheck`, `npm test`, and `npm run check:perf` where the ticket touches pages; report any budget that is over. Enforced by: `.github/workflows/ci.yml`
- Decisions are appended: a new product or process decision is a new entry at the end of `docs/decisions.md` (next id, status, reason), never an edit of an old one; a reversal sets the old entry to `superseded by D-nnn`. A commit that applies one ends with the trailer `Decision: D-nnn`. Enforced by: `web/scripts/decision-log.ts`
- Tickets are written with their tracker, `private#N` or `oss#N`, never a bare number, in the decision log and the release map. Enforced by: `web/scripts/decision-log.ts`
- The release map is generated: after the owner places a tag, `make releases` and a commit of `docs/releases.md` close the release; a pushed tag is never moved. Enforced by: `web/scripts/releases.ts`
- This repo is public: write no local absolute path, secret or private tracker number in a committed file. Enforced by: `web/scripts/agent-brief-guard.test.ts`

## Liveness and escalation protocol

### Heartbeat

- Where: a comment on the ticket's issue in the private tracker, appended, never edited.
- Format, one greppable line: `HEARTBEAT <ticket> <UTC time> <checkpoint> | uncommitted=<n> | last-green=<command or none> | next=<one phrase>`
- Example: `HEARTBEAT #<n> 2026-10-29T14:02Z unit-tests-written | uncommitted=3 | last-green=npm test | next=wire playwright config`
- Cadence: at each checkpoint (plan agreed, tests written, implementation green, specs green, ready to hand back) and at least every 20 minutes of work. No line is needed if nothing changed.

### Idle timeout and stuck signal

- Twenty minutes without a heartbeat or a tool call counts as stuck.
- When an agent is stuck, the coordinator (the session that launched it) reads the last heartbeat and either resumes the agent from `next=`, or starts a new agent from the last heartbeat and the working tree. An agent is never silently restarted from scratch: the heartbeat names the last green command.

### Blocking questions

- Ask once, as an issue comment: `BLOCKED <ticket>: <question> (recommended: <option>)`, and stop touching the area in question.
- The owner answers in the same thread. The coordinator may answer only when the owner has already ruled on the same question (cite the decision).
- While waiting, work on any part of the ticket that does not depend on the answer, then hand back as `PARTIAL` with the open question listed. Do not wait idle past the idle timeout.

### Hand-back

- One final report. Its first line is `HANDBACK <ticket> <commit sha> <PASS|PARTIAL|FAILED>`, its last line is `END-HANDBACK <ticket>`, and it names the sha of this brief that the agent read.
- The receiver ignores a second report with the same ticket and sha as a duplicate.
- After a failure, resume from the last heartbeat; do not hand back a failure and then continue.
