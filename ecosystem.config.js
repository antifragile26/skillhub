// PM2 进程配置 — 服务器上用 `pm2 start ecosystem.config.js` 启动
module.exports = {
  apps: [
    {
      name: "skillhub",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/skillhub",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
