# KovaForge fork of Excalidraw

## What this fork is for

The editor behind kovaforge.org/canvas. It tracks `excalidraw/excalidraw` (remote `upstream`, branch `master`) and carries a small number of KovaForge changes.

## Upstream rule

Before any work on this fork or on kovaforge-home's canvas build, run:

```bash
scripts/kovaforge-upstream-check.sh
```

Exit codes:

- 0: up to date, or the oldest missing upstream commit is no older than the limit.
- 1: too far behind. Run `git fetch upstream && git merge upstream/master`, resolve conflicts keeping our changes, then continue.
- 2: upstream could not be checked (fetch failed). Say so and continue with care.

Environment settings (defaults in brackets):

- `KOVAFORGE_UPSTREAM_REMOTE` [`upstream`]. If missing and named `upstream`, it is added as https://github.com/excalidraw/excalidraw.git.
- `KOVAFORGE_UPSTREAM_BRANCH` [`master`]
- `KOVAFORGE_MAX_AGE_DAYS` [`7`]

The script can be run from any directory inside the repo. "Oldest missing commit" is the minimum committer timestamp among the missing commits, because timestamps are not monotonic across merges.

## Our changes to upstream files

Two hooks in `excalidraw-app/App.tsx`:

1. The `isSharingDisabled` gate, controlled by the env `VITE_APP_DISABLE_SHARING`. It switches off collaboration, the backend export and the Excalidraw+ export UI.
2. The command-palette entry "Export to Excalidraw+", whose `predicate` is `!isSharingDisabled`, so it is hidden when sharing is disabled.

One change in `excalidraw-app/index.html`:

3. `excalidraw-app/index.html`: the Simple Analytics script (scripts.simpleanalyticscdn.com) and its iframe/legacy-analytics glue are removed, replaced by a `KOVAFORGE:` comment. Why: `VITE_APP_ENABLE_TRACKING=false` did not stop it, and the built canvas must not contain third-party analytics.

Every future hook into upstream files must be marked with a `KOVAFORGE:` comment and listed here.

## Where our own code lives

`excalidraw-app/kovaforge/` (not created yet).

## Commands

Used with Node v26.12.0 and yarn 1.22.22 (`npx -y yarn@1.22.22`):

```bash
npx -y yarn@1.22.22 install --frozen-lockfile
npx -y yarn@1.22.22 test:typecheck                 # tsc
CI=true npx -y yarn@1.22.22 test:app --watch=false # vitest
cd excalidraw-app && VITE_APP_DISABLE_SENTRY=true VITE_APP_DISABLE_SHARING=true \
  VITE_APP_ENABLE_TRACKING=false npx vite build --base /canvas/   # output: excalidraw-app/build
```

## Lockfile rule

On a `yarn.lock` conflict during an upstream merge, take upstream's version (`git checkout --theirs yarn.lock`) and reinstall. Never hand-merge the lockfile.
