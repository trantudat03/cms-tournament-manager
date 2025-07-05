import Pusher from 'pusher';
import pusherConfig from '../../config/pusher';

const config = pusherConfig({ env: (key) => process.env[key] });

const pusher = new Pusher({
  appId: config.appId,
  key: config.key,
  secret: config.secret,
  cluster: config.cluster,
  useTLS: true,
});

export default pusher;