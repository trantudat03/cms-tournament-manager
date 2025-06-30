export default {
  routes: [
    {
      method: 'GET',
      path: '/tournaments/search',
      handler: 'tournament-custom.findWithSearch',
      config: {
        auth: {},
      },
    },
  ],
}; 