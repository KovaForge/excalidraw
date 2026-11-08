#!/usr/bin/env bash
# Checks that this fork has merged upstream commits no older than the limit.
# Exit 0: ok, 1: too far behind (merge upstream), 2: upstream could not be checked.
# Env: KOVAFORGE_UPSTREAM_REMOTE (upstream), KOVAFORGE_UPSTREAM_BRANCH (master),
#      KOVAFORGE_MAX_AGE_DAYS (7).
set -u

remote="${KOVAFORGE_UPSTREAM_REMOTE:-upstream}"
branch="${KOVAFORGE_UPSTREAM_BRANCH:-master}"
limit="${KOVAFORGE_MAX_AGE_DAYS:-7}"

cd "$(dirname "${BASH_SOURCE[0]}")" || exit 2
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "not inside a git repository" >&2
  exit 2
fi

if ! git remote get-url "$remote" >/dev/null 2>&1; then
  if [ "$remote" = "upstream" ]; then
    git remote add upstream https://github.com/excalidraw/excalidraw.git || exit 2
  else
    echo "remote '$remote' does not exist" >&2
    exit 2
  fi
fi

if ! timeout 120 git fetch --quiet "$remote" "$branch"; then
  echo "could not fetch $remote/$branch; upstream not checked" >&2
  exit 2
fi

ref="$remote/$branch"
if ! git rev-parse --verify --quiet "$ref^{commit}" >/dev/null; then
  echo "could not resolve $ref; upstream not checked" >&2
  exit 2
fi

count="$(git rev-list --count "HEAD..$ref")"
if [ "$count" -eq 0 ]; then
  echo "up to date with upstream"
  exit 0
fi

oldest="$(git log "HEAD..$ref" --format=%ct | tail -1)"
days=$(( ( $(date +%s) - oldest ) / 86400 ))
echo "$count upstream commits missing; the oldest is $days days old (limit $limit)"
if [ "$days" -le "$limit" ]; then
  exit 0
fi
echo "fix: git fetch upstream && git merge upstream/master"
exit 1
