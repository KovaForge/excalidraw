# AGENTS.md

## Git identity and wrappers (mandatory)

All git activity in this repo MUST go through a per-person wrapper. No bare `git push`.

| Agent | Wrapper |
|---|---|
| Aoife | `git-aoife` |
| Mikhail | `git-mikhail` |
| Declan | `git-declan` |
| Vladislava | `git-vladislava` |

Whoever pushes uses their own wrapper. Example: Declan pushes with `git-declan push`, Vladislava with `git-vladislava push`. Wrappers set committer identity and route the push to the correct per-person remote on the matching `github-<person>` SSH host.

Run `git-<person> whoami` to confirm before pushing.

## Source of truth

Inherited from `/Users/mike/Projects/KovaForge/AGENTS.md`. When this file and the parent conflict, the parent wins until this file is updated to match.

# Guidelines

- For new DOM/browser API usage, use `app.ownerDocument` and `app.ownerWindow` instead of globals; without `app`, derive them from the mounted node's `ownerDocument` and its `defaultView`.
- When overriding properties of an existing type, prefer `Merge<Base, Overrides>` from `@excalidraw/common/utility-types` over `Omit<Base, keyof Overrides> & Overrides`.


## KovaForge upstream rule

Before any work on this fork, or on kovaforge-home's canvas build, run `scripts/kovaforge-upstream-check.sh`.

- Exit 0: up to date, or the oldest missing upstream commit is within the age limit. Continue.
- Exit 1: too far behind. Merge upstream first (`git fetch upstream && git merge upstream/master`), resolve conflicts keeping our changes, and only then continue. On a `yarn.lock` conflict take upstream's version (`git checkout --theirs yarn.lock`) and reinstall.
- Exit 2: upstream could not be checked (fetch failed). Say so in your report and continue with care.

See `KOVAFORGE.md` for the list of our changes to upstream files and the build commands.
