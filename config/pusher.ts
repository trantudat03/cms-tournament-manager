export default ({ env }) => ({
    appId: env('PUSHER_APP_ID'),
    key: env('PUSHER_KEY'),
    secret: env('PUSHER_SECRET'),
    cluster: env('PUSHER_CLUSTER'),
    useTLS: true,
  });