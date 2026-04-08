// PM2 configuration pour déploiement Hostinger VPS
// Lancer : pm2 start ecosystem.config.js
// Reload  : pm2 reload hedjav

module.exports = {
  apps: [
    {
      name: 'hedjav',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      cwd: '/var/www/hedjav-web',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/hedjav-error.log',
      out_file: '/var/log/pm2/hedjav-out.log',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
    },
  ],
}
