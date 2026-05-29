module.exports = {
  apps: [
    {
      name: 'linkchest-api',
      script: './project/deploy/start-api.sh',
      cwd: '/opt/linkchest/api',
      env: {
        NODE_ENV: 'production',
        MARKET: 'china'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
