#!/bin/bash
# 首次服务器初始化脚本 — 仅在全新服务器上运行一次
# 用法: 以 root 登录服务器后, 直接把本文件内容粘贴执行, 或:
#   curl -fsSL https://raw.githubusercontent.com/antifragile26/skillhub/main/setup.sh | bash
set -e

echo "==> 更新系统 & 安装 git nginx"
dnf update -y
dnf install -y git nginx

echo "==> 安装 Node.js 20"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
fi
node -v && npm -v

echo "==> 配置 npm 镜像 & 安装 PM2"
npm config set registry https://registry.npmmirror.com
npm install -g pm2

echo "==> 拉取代码到 /var/www/skillhub"
mkdir -p /var/www
cd /var/www
if [ ! -d skillhub ]; then
  git clone https://github.com/antifragile26/skillhub.git
fi
cd skillhub

echo "==> 配置 Nginx 反向代理"
cat > /etc/nginx/conf.d/skillhub.conf << 'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX
nginx -t
systemctl enable --now nginx

echo ""
echo "========================================"
echo "基础环境就绪。接下来手动完成 3 步："
echo "1. cd /var/www/skillhub && cp .env.local.example .env.local && vi .env.local"
echo "   (填入真实的 Supabase URL 和 KEY)"
echo "2. npm install && npm run build"
echo "3. pm2 start ecosystem.config.js && pm2 save && pm2 startup systemd"
echo "========================================"
