export default {
  routes: [
    {
      method: 'GET',
      path: '/system-tournaments/me',
      handler: 'system-tournament-custom.findByCurrentUser',
      config: {
        auth: {},
      },
    },
    {
      method: 'POST',
      path: '/system-tournaments/me',
      handler: 'system-tournament-custom.createByCurrentUser',
      config: {
        auth: {},
      },
    },
    {
      method: 'PUT',
      path: '/system-tournaments/me/:id',
      handler: 'system-tournament-custom.updateByCurrentUser',
      config: {
        auth: {},
      },
    },
  ],
}; 