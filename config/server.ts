export default ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  app: {
    keys: env.array("APP_KEYS", ["myKeyA", "myKeyB"]),
  },
  cron: {
    enabled: true,
    tasks: {
      '0 5 * * *': {
        task: require('./cron-tasks/updateIsUseTrial').default,
      },
    },
  },
  // Tăng giới hạn upload
  upload: {
    config: {
      provider: 'local',
      providerOptions: {
        sizeLimit: 100 * 1024 * 1024, // 100MB
      },
    },
  },
});
