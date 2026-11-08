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

4. `.eslintignore`: one line excluding `excalidraw-app/kovaforge/diagram.ts` (see the copy contract below).

Every future hook into upstream files must be marked with a `KOVAFORGE:` comment and listed here.

## Where our own code lives

`excalidraw-app/kovaforge/`. Everything KovaForge adds to the app goes here, so upstream merges stay small.

- Interfaces (`engine.ts`): a `LayoutEngine` turns a neutral `Diagram` into a `PositionedDiagram` (top-left `Rect` per node, route hints per edge); a `DiagramEngine` turns that into its own JSON-serialisable `EngineScene` and exports it as SVG and PNG. `registry.ts` looks both up by id (defaults `excalidraw` and `dagre`); nothing is registered on import, app code calls `registerDefaults()`. To swap an engine or layout, write one adapter and register it. Only `engine-excalidraw.ts` knows about Excalidraw and only `layout-dagre.ts` knows about dagre.
- Layout: `layout-dagre.ts` (dagre node x and y are centres; converted to top-left). Excalidraw adapter: `engine-excalidraw.ts` (`exportScene`, since this version of Excalidraw replaced `exportToSvg` and `exportToBlob`).
- Dependency added: `@dagrejs/dagre` at exactly 3.1.3 (MIT, in `excalidraw-app/package.json`), approved for graph layout. It pulls in `@dagrejs/graphlib`. On a `yarn.lock` conflict follow the lockfile rule below.
- Copy contract: `excalidraw-app/kovaforge/diagram.ts` is a byte-for-byte copy of `src/canvas/diagram.ts` in kovaforge-home. Change it there, then `cp` it here; never edit this copy. `canvas/build.sh` in kovaforge-home refuses to build when the two differ, and `diagram.test.ts` checks it when the hub checkout is next to this repo. The file is listed in `.eslintignore` (marked `KOVAFORGE:`) so lint cannot reformat it.

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
