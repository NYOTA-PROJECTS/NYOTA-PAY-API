module.exports = {
    apps : [{
      name: 'NYOTAPAY',
      script: 'app.js',
      instances: 4,
      watch: '.',
      ignore_watch: ['node_modules', 'public'],
    }],
    deploy : {
      production : {
        user : 'root',
        host : '194.163.180.27',
        ref  : 'origin/main',
        repo : 'https://github.com/NYOTA-PROJECTS/NYOTA-PAY-API.git',
        path : '/root/NYOTAPAY/NYOTA-PAY-API',
        'pre-deploy-local': '',
        'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
        'pre-setup': ''
      }
    }
  };
    