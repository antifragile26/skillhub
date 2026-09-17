#!/bin/bash
# 发布指定 SHA：bash deploy.sh <commit-sha>
# 旧版本保留在 releases/，current 只指向已构建并验证过的版本。
set -Eeuo pipefail

APP_ROOT="/var/www/skillhub"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
RELEASE_SHA="${1:?用法：bash deploy.sh <commit-sha>}"

if ! [[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "无效的 commit SHA：$RELEASE_SHA" >&2
  exit 2
fi

if [[ -n "$(git -C "$APP_ROOT" status --porcelain)" ]]; then
  echo "工作目录有未提交改动，已停止发布以保护现场" >&2
  exit 3
fi

echo "==> 获取目标提交 $RELEASE_SHA"
git -C "$APP_ROOT" fetch --no-tags origin "$RELEASE_SHA"
git -C "$APP_ROOT" cat-file -e "$RELEASE_SHA^{commit}"

mkdir -p "$RELEASES_DIR"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_SHA"
if [[ ! -d "$RELEASE_DIR" ]]; then
  echo "==> 建立隔离 release 目录"
  git -C "$APP_ROOT" worktree add --detach "$RELEASE_DIR" "$RELEASE_SHA"
  if [[ -f "$APP_ROOT/.env.local" ]]; then
    install -m 600 "$APP_ROOT/.env.local" "$RELEASE_DIR/.env.local"
  else
    echo "缺少 $APP_ROOT/.env.local，已停止发布" >&2
    git -C "$APP_ROOT" worktree remove "$RELEASE_DIR"
    exit 4
  fi
  echo "==> 使用 package-lock 安装依赖"
  npm ci --prefix "$RELEASE_DIR"
  echo "==> 构建目标提交"
  npm run build --prefix "$RELEASE_DIR"
fi

PREVIOUS_TARGET=""
if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK")"
fi
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

echo "==> 重启服务并写入公开版本元数据"
export DEPLOY_COMMIT_SHA="$RELEASE_SHA"
export DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
pm2 startOrRestart "$APP_ROOT/ecosystem.config.js" --update-env

echo "commit=$RELEASE_SHA"
echo "deployed_at=$DEPLOYED_AT"
echo "previous_release=${PREVIOUS_TARGET:-none}"
pm2 status skillhub
