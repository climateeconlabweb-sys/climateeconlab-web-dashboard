#!/usr/bin/env bash
set -euo pipefail

# GitHub Pages용 정적 빌드.
#
# /admin CMS와 그 API 라우트는 서버가 있어야 동작하므로 정적 내보내기에 포함될 수 없다.
# (force-static으로 굳히면 요청 헤더를 못 읽어 로컬 CMS 인증이 깨진다 — 그래서 빌드 동안만 비켜둔다.)
# 빌드가 실패하거나 중단돼도 trap으로 반드시 되돌린다.

cd "$(dirname "$0")/.."

SERVER_ONLY=(api admin)
STASH=".pages-build-stash"

restore() {
  for name in "${SERVER_ONLY[@]}"; do
    if [ -d "$STASH/$name" ]; then
      rm -rf "src/app/$name"
      mv "$STASH/$name" "src/app/$name"
    fi
  done
  rmdir "$STASH" 2>/dev/null || true
}

restore              # 이전 실행이 강제 종료됐을 경우를 대비해 먼저 복구
trap restore EXIT

mkdir -p "$STASH"
for name in "${SERVER_ONLY[@]}"; do
  [ -d "src/app/$name" ] && mv "src/app/$name" "$STASH/$name"
done

STATIC_EXPORT=1 \
NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/climateeconlab-web-dashboard}" \
  npx next build
