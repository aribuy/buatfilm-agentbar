module.exports = {
  apps: [{
    name: 'notification-worker',
    script: './workers/notification-worker.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PG_HOST: 'localhost',
      PG_DATABASE: 'ai_movie_course',
      PG_USER: 'api_user',
      PG_PASSWORD: 'BuatFilm2025!Secure'
    },
    error_file: './logs/worker-error.log',
    out_file: './logs/worker-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
