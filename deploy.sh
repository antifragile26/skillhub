#!/bin/bash
# 更新部署脚本 — 服务器上代码有更新时运行: bash deploy.sh
set -e

cd /var/www/skillhub

echo "==> 拉取最新代码"
git pull

echo "==> 安装依赖"
npm install

echo "==> 构建"
npm run build

echo "==> 重启服务"
pm2 restart skillhub

echo "==> 完成，当前状态："
pm2 status skillhub
