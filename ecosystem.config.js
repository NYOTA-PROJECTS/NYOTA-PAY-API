module.exports = {
    apps: [{
      name: "NYOTA-PAY",
      script: 'app.js',
      instances: 4,
      exec_mode: 'cluster',
      watch: '.',
      ignore_watch: ['node_modules', 'public'],
      env: {
        NODE_ENV: 'development',
        PORT: 3500
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3500
      }
    }, {
      name: 'NYOTASHOP-service-worker',
      script: './service-worker/',
      watch: ['./service-worker'],
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }],
  
    deploy: {
      production: {
        user: 'root',
        host: '194.163.180.27',
        ref: 'origin/main',
        repo: 'https://github.com/NYOTA-PROJECTS/NYOTA-SHOP.git',
        path: '/root/api-nyotashop',
        'pre-deploy-local': '',
        'post-deploy': 'npm install && npx sequelize-cli db:migrate --env production && npx sequelize-cli db:seed:all --env production && pm2 reload ecosystem.config.js --env production',
        'pre-setup': ''
      },
      development: {
        user: 'root',
        host: '194.163.180.27',
        ref: 'origin/develop',
        repo: 'https://github.com/NYOTA-PROJECTS/NYOTA-SHOP.git',
        path: '/root/api-nyotashop-dev',
        'pre-deploy-local': '',
        'post-deploy': 'npm install && npx sequelize-cli db:migrate --env development && npx sequelize-cli db:seed:all --env development && pm2 reload ecosystem.config.js --env development',
        'pre-setup': ''
      }
    }
  };
  